$ErrorActionPreference = "Stop"

Set-Location -Path $PSScriptRoot

function Add-NodeToPathIfNeeded {
  $nodeBin = "C:\Program Files\nodejs"
  if (Test-Path "$nodeBin\node.exe") {
    $pathParts = $env:Path -split ";"
    if ($pathParts -notcontains $nodeBin) {
      $env:Path = "$nodeBin;$env:Path"
    }
  }
}

Add-NodeToPathIfNeeded

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js not found. Install Node.js LTS first: winget install OpenJS.NodeJS.LTS" -ForegroundColor Red
  exit 1
}

if (Get-Command corepack -ErrorAction SilentlyContinue) {
  Write-Host "Starting dev server via corepack pnpm..." -ForegroundColor Cyan
  & corepack pnpm dev
  exit $LASTEXITCODE
}

if (Get-Command pnpm -ErrorAction SilentlyContinue) {
  Write-Host "Starting dev server via pnpm..." -ForegroundColor Cyan
  & pnpm dev
  exit $LASTEXITCODE
}

Write-Host "pnpm is not available. Run: corepack prepare pnpm@latest --activate" -ForegroundColor Red
exit 1
