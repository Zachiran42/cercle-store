$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$toolFile = Join-Path $projectRoot '.toolchain.json'
$tools = if (Test-Path -LiteralPath $toolFile) { Get-Content -Raw -LiteralPath $toolFile | ConvertFrom-Json } else { $null }
$gh = if ($tools.ghExecutable) { $tools.ghExecutable } else { (Get-Command gh -ErrorAction Stop).Source }
if ($tools.ghConfigDir) { $env:GH_CONFIG_DIR = $tools.ghConfigDir }
& $gh auth login --hostname github.com --git-protocol https --web
