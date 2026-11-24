#!/usr/bin/env bash
# Negative tests for the guards. Fake secrets are assembled at run time so this file holds none.
# Usage: test-guards.sh   (run from the repo root; uses a scratch git repo, never touches the real one)
set -uo pipefail
here=$(cd "$(dirname "$0")" && pwd); SCAN=$here/secret-scan.sh; PAY=$here/check-payload.sh
t=$(mktemp -d); trap 'rm -rf "$t"' EXIT; cd "$t"
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
# payload allowlist
rm -rf pay; mkdir -p pay/img; echo x > pay/index.html; echo x > pay/img/a.png; echo x > pay/robots.txt
expect pass "clean payload passes" bash "$PAY" pay
for bad_name in notes.md tool.py run.sh .env cert.pem id.key req.csr doc.rtf CLAUDE.md memory/x.txt .git-credentials app.js.map data.json Makefile noext; do
  rm -rf pay2; cp -r pay pay2; mkdir -p "pay2/$(dirname "$bad_name")"; echo x > "pay2/$bad_name"
  expect fail "payload rejects $bad_name" bash "$PAY" pay2
done
rm -rf pay2; cp -r pay pay2; ln -s /etc/hostname pay2/link.txt; expect fail "payload rejects symlink" bash "$PAY" pay2
mkdir -p empty; expect fail "empty payload fails" bash "$PAY" empty
expect fail "missing payload dir fails" bash "$PAY" nope
echo "passed=$pass wrong=$bad"; [ "$bad" = 0 ]
