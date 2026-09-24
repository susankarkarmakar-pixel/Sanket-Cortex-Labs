$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "Node.js 20 or newer is required. Install it from https://nodejs.org/"
}

if (-not (Test-Path "node_modules")) {
  npm ci
}
if (-not (Test-Path ".next/BUILD_ID")) {
  npm run build
}

Start-Process "http://localhost:3000"
npm run start
