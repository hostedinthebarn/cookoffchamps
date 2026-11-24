#!/usr/bin/env bash
# Secret scan, no model. Usage:
#   secret-scan.sh diff <base-commit-or-tree>   scan only lines added since base
#   secret-scan.sh dir  <path>                  scan every text file under path (the deploy payload)
# Patterns are Gary's deploy-rule list. Each is written with a [x] bracket so this file never matches itself.
# A hit fails the run. Matching lines are never printed (a log is a place a secret can leak): only path:line.
# Allowlist: .ci/secret-scan-allow.tsv, one "path-glob<TAB>fixed substring of the line" per row; reviewed by Gary.
set -euo pipefail
mode=${1:?usage: secret-scan.sh diff <base> | dir <path>}; arg=${2:?usage}
allow=${SECRET_SCAN_ALLOW:-.ci/secret-scan-allow.tsv}
PAT_I=('[c]lient_secret' '[a]pi[_-]?key' '[r]efresh_token' '[p]assword' '[t]oken=')   # case-insensitive
PAT_S=('[G]OCSPX-' 'BEGI[N] .*PRIVATE KEY' '[A]KIA' '[B]earer ')                       # case-sensitive
work=$(mktemp -d); trap 'rm -rf "$work"' EXIT
P=$work/paths L=$work/lines N=$work/nums; : >"$P"; : >"$L"; : >"$N"

case $mode in
  diff)
    base=$(git merge-base "$arg" HEAD 2>/dev/null || echo "$arg")
    git diff -U0 --no-color --diff-filter=AM "$base" HEAD | awk -v P="$P" -v L="$L" -v N="$N" '
      /^\+\+\+ b\//   { f = substr($0, 7); next }
      /^@@ /          { match($0, /\+[0-9]+/); ln = substr($0, RSTART + 1, RLENGTH - 1) + 0; next }
      /^\+/           { print f >> P; print substr($0, 2) >> L; print ln >> N; ln++ }' ;;
  dir)
    [ -d "$arg" ] || { echo "no such directory: $arg" >&2; exit 2; }
    find "$arg" -type f -not -path '*/.git/*' -print0 | xargs -0 -r grep -IHn -e '' 2>/dev/null \
      | sed -E 's/^([^:]*):([0-9]+):/\1\t\2\t/' > "$work/all" || true
    cut -f1 "$work/all" >"$P"; cut -f2 "$work/all" >"$N"; cut -f3- "$work/all" >"$L" ;;
  *) echo "unknown mode $mode" >&2; exit 2 ;;
esac

scanned=$(wc -l <"$L")
ai=(); for p in "${PAT_I[@]}"; do ai+=(-e "$p"); done
as=(); for p in "${PAT_S[@]}"; do as+=(-e "$p"); done
{ grep -inE "${ai[@]}" "$L" || true; grep -nE "${as[@]}" "$L" || true; } | cut -d: -f1 | sort -un >"$work/hit-lines"

fail=0
while read -r n; do
  [ -n "$n" ] || continue
  path=$(sed -n "${n}p" "$P"); line=$(sed -n "${n}p" "$L"); num=$(sed -n "${n}p" "$N")
  ok=0
  if [ -f "$allow" ]; then
    while IFS=$'\t' read -r glob sub; do
      case $glob in ''|'#'*) continue ;; esac
      # shellcheck disable=SC2254
      case $path in $glob) [[ -n $sub && $line == *"$sub"* ]] && { ok=1; break; } ;; esac
    done <"$allow"
  fi
  if [ $ok = 0 ]; then echo "::error file=$path,line=$num::secret-shaped text (content not printed)"; fail=1; fi
done <"$work/hit-lines"

echo "secret-scan $mode: $scanned lines scanned"
[ "$fail" = 0 ] || { echo "FAILED: any hit fails. Remove it, or if it is a reviewed false positive add a row to $allow (takes effect after merge)." >&2; exit 1; }
