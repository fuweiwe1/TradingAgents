$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $RootDir

Write-Host "==> Current directory: $(Get-Location)"

Write-Host "==> Checking required files"
$RequiredFiles = @(
  "AGENTS.md",
  "claude-progress.md",
  "clean-state-checklist.md",
  "feature_list.json",
  "init.sh",
  "init.ps1",
  "session-handoff.md"
)

foreach ($File in $RequiredFiles) {
  if (-not (Test-Path -LiteralPath $File -PathType Leaf)) {
    throw "Missing required file: $File"
  }
}

Write-Host "==> Validating feature_list.json"
Get-Content -LiteralPath "feature_list.json" -Raw -Encoding UTF8 | ConvertFrom-Json | Out-Null

if (Test-Path -LiteralPath ".git" -PathType Container) {
  Write-Host "==> Recent commits"
  git log --oneline -5
} else {
  Write-Host "==> Current directory is not a git repository; skipping git log"
}

if (Test-Path -LiteralPath "package.json" -PathType Leaf) {
  Write-Host "==> package.json detected"
  if (Get-Command bun -ErrorAction SilentlyContinue) {
    Write-Host "Available command: bun install && bun test"
  } elseif (Get-Command npm -ErrorAction SilentlyContinue) {
    Write-Host "Available command: npm install && npm test"
  } else {
    Write-Host "bun/npm not found; cannot run JS project verification"
  }
} else {
  Write-Host "==> No project package.json detected; init.ps1 only checks workflow files for now"
}

Write-Host "==> init.ps1 completed"
