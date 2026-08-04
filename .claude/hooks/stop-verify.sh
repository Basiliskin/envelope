#!/bin/bash
# Stop: перед завершением ответа — компиляция, unit-тесты, наличие тестов на изменения.
# Блокирует завершение через {"decision":"block"}, чтобы Claude починил сам.
set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

block() {
  node -e 'process.stdout.write(JSON.stringify({decision:"block",reason:process.argv[1]}))' "$1"
  exit 0
}

if ! out=$(npx --no-install tsc --noEmit --pretty false 2>&1); then
  block "Компиляция падает:
$out"
fi

if [ -f .claude/hooks/check-tests.mjs ]; then
  if ! out=$(node .claude/hooks/check-tests.mjs --changed 2>&1); then
    block "$out"
  fi
fi

if [ -d src ]; then
  if ! out=$(npx --no-install vitest run '.unit.test.ts' --reporter=dot --passWithNoTests 2>&1); then
    block "Unit-тесты падают:
$out"
  fi
fi

exit 0
