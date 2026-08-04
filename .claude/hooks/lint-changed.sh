#!/bin/bash
# PostToolUse: prettier + eslint по одному изменённому файлу. Должен быть быстрым.
set -uo pipefail
input=$(cat)
file=$(printf '%s' "$input" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(JSON.parse(s).tool_input?.file_path??"")}catch{}})')
[ -z "$file" ] && exit 0
[ -f "$file" ] || exit 0
case "$file" in *.ts|*.tsx) ;; *) exit 0 ;; esac

npx --no-install prettier --write "$file" >/dev/null 2>&1

if out=$(npx --no-install eslint "$file" --max-warnings 0 2>&1); then
  exit 0
fi
echo "ESLint: проблемы в $file" >&2
echo "$out" >&2
exit 2
