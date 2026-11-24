#!/usr/bin/env bash
# Negative tests for the guards. Fake secrets are assembled at run time so this file holds none.
# Usage: test-guards.sh   (run from the repo root; uses a scratch git repo, never touches the real one)
set -uo pipefail
here=$(cd "$(dirname "$0")" && pwd); SCAN=$here/secret-scan.sh; PAY=$here/check-payload.sh
t=$(mktemp -d) || exit 1; trap 'rm -rf "$t"' EXIT; cd "$t" || exit 1
git init -q . && git config user.email t@t && git config user.name t
echo '<p>hello</p>' > index.html; git add -A; git commit -qm base; base=$(git rev-parse HEAD)
pass=0; bad=0
expect() { # expect <pass|fail> <label> <cmd...>
  want=$1; label=$2; shift 2
  if "$@" >/dev/null 2>&1; then got=pass; else got=fail; fi
  if [ "$got" = "$want" ]; then pass=$((pass+1)); else bad=$((bad+1)); echo "WRONG: $label (wanted $want, got $got)"; fi
}
fakes=("client_""secret=abc12345" "GOC""SPX-abcdefghijk" "my_api""_key = 'zzz'" "-----BEGIN RSA PRIV""ATE KEY-----"
       "refresh_""token: 1//abc" "AK""IAABCDEFGHIJKLMNOP" "Authorization: Bear""er abc.def" "pass""word = hunter2" "?tok""en=abc")
i=0
for s in "${fakes[@]}"; do
  i=$((i+1)); git checkout -q "$base" 2>/dev/null; git checkout -q -B "t$i"
  printf 'x = 1\n%s\n' "$s" > app.js; git add -A; git commit -qm c
  expect fail "diff catches fake #$i" bash "$SCAN" diff "$base"
  mkdir -p pl; cp app.js pl/app.js; expect fail "dir catches fake #$i" bash "$SCAN" dir pl; rm -rf pl
done
git checkout -q "$base"; git checkout -q -B clean; echo 'const a = 1;' > ok.js; git add -A; git commit -qm c
expect pass "clean diff passes" bash "$SCAN" diff "$base"
# old secret outside the diff: diff mode ignores it (dir mode on the payload is what covers it)
git checkout -q -B old "$base"; printf '%s\n' "pass""word=x" > old.txt; git add -A; git commit -qm old; b2=$(git rev-parse HEAD)
echo 'const b = 2;' > new.js; git add -A; git commit -qm new
expect pass "old line outside diff not flagged (documented)" bash "$SCAN" diff "$b2"
expect fail "same line caught by dir mode" bash "$SCAN" dir .
# allowlist
mkdir -p od; cp old.txt od/old.txt
printf 'od/old.txt\tpass%s\n' "word=x" > allow.tsv
expect fail "no allowlist: dir scan of od fails" bash "$SCAN" dir od
expect pass "allowlist row suppresses" env SECRET_SCAN_ALLOW=$t/allow.tsv bash "$SCAN" dir od
printf 'other.txt\tpass%s\n' "word=x" > allow.tsv
expect fail "allowlist row for another path does not suppress" env SECRET_SCAN_ALLOW=$t/allow.tsv bash "$SCAN" dir od
printf 'od/old.txt\tsomething else\n' > allow.tsv
expect fail "allowlist row with another substring does not suppress" env SECRET_SCAN_ALLOW=$t/allow.tsv bash "$SCAN" dir od
# redaction: the secret must not appear in output
out=$(bash "$SCAN" dir od 2>&1 || true); case $out in *::error*) ;; *) bad=$((bad+1)); echo "WRONG: redaction test saw no error";; esac; case $out in *"word=x"*) bad=$((bad+1)); echo "WRONG: content printed";; *) pass=$((pass+1));; esac
# hardening (CodeRabbit on PR #38): ways a change could hide a line from the diff scan
git checkout -q -B attr "$base"; printf '*.js binary\n' > .gitattributes; printf '%s\n' "pass""word = hunter2" > hid.js
git add .gitattributes hid.js; git commit -qm attr
expect fail "a .gitattributes binary mark doesn't hide added lines" bash "$SCAN" diff "$base"
git checkout -q -B ren "$base"; printf 'line %s\n' $(seq 1 30) > big.txt; git add big.txt; git commit -qm big; b3=$(git rev-parse HEAD)
git mv big.txt moved.txt; printf '%s\n' "pass""word = hunter2" >> moved.txt; git add moved.txt; git commit -qm mv
expect fail "a renamed file's added lines are scanned" bash "$SCAN" diff "$b3"
git checkout -q -B hdr "$base"; printf '%s\n' "++ b/x.js pass""word = hunter2" > h.txt; git add h.txt; git commit -qm hdr
expect fail "an added line that looks like a +++ header doesn't end the hunk" bash "$SCAN" diff "$base"
# an allowlist row exempts only its own phrase, not the rest of the line
mkdir -p long; printf '%s %s\n' "there is no pass""word here" "tok""en=abc123" > long/app.js
printf 'long/app.js\tno pass%s here\n' "word" > allow.tsv
expect fail "row exempts its phrase only; another pattern on the same line still fails" env SECRET_SCAN_ALLOW=$t/allow.tsv bash "$SCAN" dir long
printf '%s\n' "there is no pass""word here" > long/app.js
expect pass "row exempts its phrase when nothing else is on the line" env SECRET_SCAN_ALLOW=$t/allow.tsv bash "$SCAN" dir long
mkdir -p unreadable; echo x > unreadable/a.txt; mkdir unreadable/locked; chmod 000 unreadable/locked
expect fail "a payload that can't be fully read fails the scan" bash "$SCAN" dir unreadable
expect fail "a payload that can't be fully listed fails the check" bash "$PAY" unreadable
chmod 755 unreadable/locked
# payload allowlist
rm -rf pay; mkdir -p pay/img; echo x > pay/index.html; echo x > pay/img/a.png; echo x > pay/robots.txt
expect pass "clean payload passes" bash "$PAY" pay
for bad_name in notes.md tool.py run.sh .env cert.pem id.key req.csr doc.rtf CLAUDE.md memory/x.txt .git-credentials data.json Makefile noext; do
  rm -rf pay2; cp -r pay pay2; mkdir -p "pay2/$(dirname "$bad_name")"; echo x > "pay2/$bad_name"
  expect fail "payload rejects $bad_name" bash "$PAY" pay2
done
rm -rf pay2; cp -r pay pay2; ln -s /etc/hostname pay2/link.txt; expect fail "payload rejects symlink" bash "$PAY" pay2
mkdir -p empty; expect fail "empty payload fails" bash "$PAY" empty
expect fail "missing payload dir fails" bash "$PAY" nope
echo "passed=$pass wrong=$bad"; [ "$bad" = 0 ]
