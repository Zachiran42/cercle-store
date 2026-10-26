param([string]$ToolchainFile = '')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
if (-not $ToolchainFile) { $ToolchainFile = Join-Path $projectRoot '.toolchain.json' }
$tools = Get-Content -Raw -LiteralPath $ToolchainFile | ConvertFrom-Json
& (Join-Path $PSScriptRoot 'build-android.ps1') -ToolchainFile $ToolchainFile
& (Join-Path $PSScriptRoot 'build-android.ps1') -ToolchainFile $ToolchainFile -VersionCode 4 -VersionName '0.2.1-test' -OutputName 'cercle-update-test.apk'
$testDir = Join-Path $projectRoot 'build\qa'
New-Item -ItemType Directory -Path $testDir -Force | Out-Null
$env:CERCLE_TEST_KEY_PASS = 'test-only'
$key = Join-Path $testDir 'other-test-key.keystore'
if (-not (Test-Path -LiteralPath $key)) { & (Join-Path $tools.javaHome 'bin\keytool.exe') -genkeypair -keystore $key -storepass:env CERCLE_TEST_KEY_PASS -keypass:env CERCLE_TEST_KEY_PASS -alias cercle -keyalg RSA -keysize 2048 -validity 30 -dname 'CN=Other test signer' | Out-Null; if ($LASTEXITCODE -ne 0) { throw 'Creation de la cle de test impossible.' } }
$env:CERCLE_WRONG_SIGNER = Join-Path $testDir 'wrong-signer.apk'
& (Join-Path $tools.javaHome 'bin\java.exe') -jar (Join-Path $tools.buildTools 'lib\apksigner.jar') sign --ks $key --ks-pass env:CERCLE_TEST_KEY_PASS --key-pass env:CERCLE_TEST_KEY_PASS --ks-key-alias cercle --out $env:CERCLE_WRONG_SIGNER (Join-Path $projectRoot 'build\cercle-update-test.apk')
if ($LASTEXITCODE -ne 0) { throw 'Preparation du cas de signature impossible.' }
$env:CERCLE_TOOLCHAIN = $ToolchainFile
$env:CERCLE_TEST_ROOT = $testDir
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$nodeBinary = if ($nodeCommand) { $nodeCommand.Source } else { Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }
& $nodeBinary --test (Join-Path $projectRoot 'tests\store.test.mjs') (Join-Path $projectRoot 'tests\github.test.mjs') (Join-Path $projectRoot 'tests\publisher.test.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Un test a echoue.' }
