#!/usr/bin/env bash
# Secret scan, no model. Usage:
#   secret-scan.sh diff <base-commit-or-tree>   scan only lines added since base
#   secret-scan.sh dir  <path>                  scan every text file under path (the deploy payload)
# Patterns are Gary's deploy-rule list. Each is written with a [x] bracket so this file never matches itself.
# A hit fails the run. Matching lines are never printed (a log is a place a secret can leak): only path:line.
# Allowlist: .ci/secret-scan-allow.tsv, one "path-glob<TAB>fixed substring" per row, reviewed by Gary. A row
# exempts only the occurrences of its substring: they are cut out of the line and the rest is scanned again,
# so a row for one phrase on a long minified line doesn't blind the scan to the rest of that line.
# The allowlist file itself is not scanned (its rows quote the phrases they exempt); it is read from the base
# branch on PRs and every change to it is reviewed.
set -euo pipefail
mode=${1:?usage: secret-scan.sh diff <base> | dir <path>}; arg=${2:?usage}
allow=${SECRET_SCAN_ALLOW:-.ci/secret-scan-allow.tsv}
ALLOW_REPO_PATH=.ci/secret-scan-allow.tsv
PAT_I=('[c]lient_secret' '[a]pi[_-]?key' '[r]efresh_token' '[p]assword' '[t]oken=')   # case-insensitive
PAT_S=('[G]OCSPX-' 'BEGI[N] .*PRIVATE KEY' '[A]KIA' '[B]earer ')                       # case-sensitive
ai=(); for p in "${PAT_I[@]}"; do ai+=(-e "$p"); done
as=(); for p in "${PAT_S[@]}"; do as+=(-e "$p"); done
work=$(mktemp -d); trap 'rm -rf "$work"' EXIT
P=$work/paths L=$work/lines N=$work/nums; : >"$P"; : >"$L"; : >"$N"

case $mode in
  diff)
    base=$(git merge-base "$arg" HEAD 2>/dev/null || echo "$arg")
    # --no-textconv/--no-ext-diff: no repo-configured filter decides what the scanner sees.
    # R and C: a renamed or copied file's added lines are scanned too.
    git -c core.quotePath=false diff -U0 --no-color --no-textconv --no-ext-diff --diff-filter=AMRC \
      "$base" HEAD >"$work/patch"
    # A "+++ b/" line is a file header only before the first hunk of a file; inside a hunk it's content.
    # Files git reports as binary are listed separately, for the check below.
    LC_ALL=C awk -v P="$P" -v L="$L" -v N="$N" -v B="$work/binary" '
      /^diff --git /                    { inh = 0; f = ""; next }
      !inh && /^Binary files .* and b\/.* differ$/ { s = $0; sub(/^Binary files .* and b\//, "", s); sub(/ differ$/, "", s); print s >> B; next }
      !inh && /^\+\+\+ /                { f = ($0 ~ /^\+\+\+ b\//) ? substr($0, 7) : ""; next }
      /^@@ /                            { inh = 1; match($0, /\+[0-9]+/); ln = substr($0, RSTART + 1, RLENGTH - 1) + 0; next }
      inh && /^\+/                      { print f >> P; print substr($0, 2) >> L; print ln >> N; ln++ }' "$work/patch"
    # A PR can mark a text file binary in .gitattributes, and git diff then prints none of its lines. Git's own
    # test for binary is a NUL byte in the first 8000 bytes; a reported-binary file without one is text, so all
    # of it is scanned. Real binaries (images, PDFs) have NULs and are left to the payload check.
    if [ -s "$work/binary" ]; then
      while IFS= read -r bf; do
        git cat-file blob "HEAD:$bf" >"$work/blob"
        if [ "$(head -c 8000 "$work/blob" | LC_ALL=C tr -d '\000' | wc -c)" -eq "$(head -c 8000 "$work/blob" | wc -c)" ]; then
          LC_ALL=C awk -v f="$bf" -v P="$P" -v L="$L" -v N="$N" '{ print f >> P; print $0 >> L; print NR >> N }' "$work/blob"
        fi
      done <"$work/binary"
    fi ;;
  dir)
    [ -d "$arg" ] || { echo "no such directory: $arg" >&2; exit 2; }
    find "$arg" -type f -not -path '*/.git/*' -print0 >"$work/files"   # a traversal error stops the scan (set -e)
    rc=0; xargs -0 -r grep -IHn -e '' <"$work/files" >"$work/all" || rc=$?
    [ "$rc" -le 1 ] || { echo "secret-scan: reading the payload failed (grep/xargs exit $rc)" >&2; exit 2; }
    sed -E 's/^([^:]*):([0-9]+):/\1\t\2\t/' "$work/all" >"$work/split"
    cut -f1 "$work/split" >"$P"; cut -f2 "$work/split" >"$N"; cut -f3- "$work/split" >"$L" ;;
  *) echo "unknown mode $mode" >&2; exit 2 ;;
esac

hits() { # hits <file>: line numbers (1-based) that match any pattern; grep's "no match" is not an error
  local rc=0
  { grep -inE "${ai[@]}" "$1" || rc=$?; [ "$rc" -le 1 ] || exit 2; rc=0
    grep -nE "${as[@]}" "$1" || rc=$?; [ "$rc" -le 1 ] || exit 2; } | cut -d: -f1 | sort -un
}
matches() { # matches <text>: does the text still contain a pattern?
  printf '%s\n' "$1" | grep -qiE "${ai[@]}" || printf '%s\n' "$1" | grep -qE "${as[@]}"
}

scanned=$(wc -l <"$L")
hits "$L" >"$work/hit-lines"

fail=0
while read -r n; do
  [ -n "$n" ] || continue
  path=$(sed -n "${n}p" "$P"); line=$(sed -n "${n}p" "$L"); num=$(sed -n "${n}p" "$N")
  [ "$path" = "$ALLOW_REPO_PATH" ] && continue
  rest=$line
  if [ -f "$allow" ]; then
    while IFS=$'\t' read -r glob sub; do
      case $glob in ''|'#'*) continue ;; esac
      [ -n "$sub" ] || continue
      # shellcheck disable=SC2254
      # Cut every literal occurrence (awk index(), not bash ${//}: that is near-quadratic on a one-line bundle).
      case $path in $glob) rest=$(printf '%s' "$rest" | S="$sub" LC_ALL=C awk '{ s = ENVIRON["S"]
          out = ""; while ((i = index($0, s)) > 0) { out = out substr($0, 1, i - 1); $0 = substr($0, i + length(s)) }
          printf "%s", out $0 }') ;; esac
    done <"$allow"
  fi
  if matches "$rest"; then echo "::error file=$path,line=$num::secret-shaped text (content not printed)"; fail=1; fi
done <"$work/hit-lines"

echo "secret-scan $mode: $scanned lines scanned"
[ "$fail" = 0 ] || { echo "FAILED: any hit fails. Remove it, or if it is a reviewed false positive add a row to $allow (takes effect after merge)." >&2; exit 1; }
