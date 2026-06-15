#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo "==> 当前目录: $PWD"

echo "==> 检查必需文件"
required_files=(
  "AGENTS.md"
  "claude-progress.md"
  "clean-state-checklist.md"
  "feature_list.json"
  "init.sh"
  "init.ps1"
  "session-handoff.md"
)

for file in "${required_files[@]}"; do
  if [ ! -f "$file" ]; then
    echo "缺少必需文件: $file" >&2
    exit 1
  fi
done

echo "==> 校验 feature_list.json"
if command -v python >/dev/null 2>&1; then
  python -m json.tool feature_list.json >/dev/null
elif command -v python3 >/dev/null 2>&1; then
  python3 -m json.tool feature_list.json >/dev/null
else
  echo "未找到 python/python3，跳过 JSON 语法校验"
fi

if [ -d ".git" ]; then
  echo "==> 最近提交"
  git log --oneline -5 || true
else
  echo "==> 当前目录还不是 git 仓库；跳过 git log"
fi

if [ -f "package.json" ]; then
  echo "==> 检测到 package.json"
  if command -v bun >/dev/null 2>&1; then
    echo "可运行: bun install && bun test"
  elif command -v npm >/dev/null 2>&1; then
    echo "可运行: npm install && npm test"
  else
    echo "未找到 bun/npm，无法运行 JS 项目验证"
  fi
else
  echo "==> 尚未检测到项目 package.json；当前 init.sh 只做约束文件检查"
fi

echo "==> init.sh 完成"
