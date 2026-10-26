param([string]$ToolchainFile = '', [string]$KeyStore = '', [int]$VersionCode = 5, [string]$VersionName = '0.3.0', [string]$OutputName = 'cercle.apk')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
if (-not $ToolchainFile) { $ToolchainFile = if ($env:CERCLE_TOOLCHAIN) { $env:CERCLE_TOOLCHAIN } else { Join-Path $projectRoot '.toolchain.json' } }
if (-not (Test-Path -LiteralPath $ToolchainFile)) { throw 'Renseignez .toolchain.json avec javaHome, androidJar et buildTools (voir README).' }
$tools = Get-Content -Raw -LiteralPath $ToolchainFile | ConvertFrom-Json
$env:JAVA_HOME = $tools.javaHome
$env:PATH = (Join-Path $tools.javaHome 'bin') + [System.IO.Path]::PathSeparator + $env:PATH
$java = Join-Path $tools.javaHome 'bin\java.exe'
$javac = Join-Path $tools.javaHome 'bin\javac.exe'
$jar = Join-Path $tools.javaHome 'bin\jar.exe'
$keytool = Join-Path $tools.javaHome 'bin\keytool.exe'
$aapt = Join-Path $tools.buildTools 'aapt2.exe'
$zipalign = Join-Path $tools.buildTools 'zipalign.exe'
$d8 = Join-Path $tools.buildTools 'd8.bat'
$build = Join-Path $projectRoot 'build'
$runDir = Join-Path $build ('compile-' + $VersionCode)
foreach ($directory in @($build, $runDir, (Join-Path $runDir 'generated'), (Join-Path $runDir 'classes'), (Join-Path $runDir 'dex'))) { New-Item -ItemType Directory -Path $directory -Force | Out-Null }
$utf8 = New-Object System.Text.UTF8Encoding($false)
Get-ChildItem -LiteralPath (Join-Path $projectRoot 'android') -Filter '*.java' -Recurse | ForEach-Object { [System.IO.File]::WriteAllText($_.FullName, [System.IO.File]::ReadAllText($_.FullName).TrimStart([char]0xFEFF), $utf8) }
$manifest = [System.IO.File]::ReadAllText((Join-Path $projectRoot 'android\AndroidManifest.xml')).Replace('android:versionCode="1"', ('android:versionCode="' + $VersionCode + '"')).Replace('android:versionName="0.1.0"', ('android:versionName="' + $VersionName + '"'))
[System.IO.File]::WriteAllText((Join-Path $runDir 'AndroidManifest.xml'), $manifest, $utf8)
Write-Output 'Compilation des ressources Android...'
& $aapt compile --dir (Join-Path $projectRoot 'android\res') -o (Join-Path $runDir 'resources.zip')
if ($LASTEXITCODE -ne 0) { throw 'Compilation des ressources impossible.' }
& $aapt link -o (Join-Path $runDir 'base.apk') -I $tools.androidJar --manifest (Join-Path $runDir 'AndroidManifest.xml') --java (Join-Path $runDir 'generated') (Join-Path $runDir 'resources.zip')
if ($LASTEXITCODE -ne 0) { throw 'Assemblage des ressources impossible.' }
$sources = @(Get-ChildItem -LiteralPath (Join-Path $projectRoot 'android\src') -Filter '*.java' -Recurse | Select-Object -ExpandProperty FullName) + @(Get-ChildItem -LiteralPath (Join-Path $runDir 'generated') -Filter '*.java' -Recurse | Select-Object -ExpandProperty FullName)
Write-Output 'Compilation du client natif...'
& $javac -encoding UTF-8 -source 8 -target 8 -classpath $tools.androidJar -d (Join-Path $runDir 'classes') @sources
if ($LASTEXITCODE -ne 0) { throw 'Compilation Java impossible.' }
& $jar "-J-Djava.io.tmpdir=$runDir" cf (Join-Path $runDir 'classes.jar') -C (Join-Path $runDir 'classes') .
if ($LASTEXITCODE -ne 0) { throw 'Creation archive Java impossible.' }
& $d8 --lib $tools.androidJar --min-api 26 --output (Join-Path $runDir 'dex') (Join-Path $runDir 'classes.jar')
if ($LASTEXITCODE -ne 0) { throw 'Conversion Android impossible.' }
& $jar "-J-Djava.io.tmpdir=$runDir" uf (Join-Path $runDir 'base.apk') -C (Join-Path $runDir 'dex') classes.dex
if ($LASTEXITCODE -ne 0) { throw 'Ajout du code Android impossible.' }
& $zipalign -f 4 (Join-Path $runDir 'base.apk') (Join-Path $runDir 'aligned.apk')
if ($LASTEXITCODE -ne 0) { throw 'Alignement impossible.' }
if (-not $KeyStore) {
  $KeyStore = Join-Path $build 'cercle-preview.keystore'
  $env:CERCLE_KEYSTORE_PASSWORD = 'android'
  if (-not (Test-Path -LiteralPath $KeyStore)) { & $keytool -genkeypair -keystore $KeyStore -storepass:env CERCLE_KEYSTORE_PASSWORD -keypass:env CERCLE_KEYSTORE_PASSWORD -alias cercle -keyalg RSA -keysize 3072 -validity 10000 -dname 'CN=Cercle Preview, O=Local development, C=FR' | Out-Null; if ($LASTEXITCODE -ne 0) { throw 'Creation de la cle de test impossible.' } }
  Write-Output 'Signature avec la cle locale de TEST. Choisir une cle de production avant distribution durable.'
} elseif (-not $env:CERCLE_KEYSTORE_PASSWORD) { throw 'Definissez CERCLE_KEYSTORE_PASSWORD avant de signer avec votre cle.' }
$outputFile = Join-Path $build $OutputName
& $java -jar (Join-Path $tools.buildTools 'lib\apksigner.jar') sign --ks $KeyStore --ks-pass env:CERCLE_KEYSTORE_PASSWORD --key-pass env:CERCLE_KEYSTORE_PASSWORD --ks-key-alias cercle --out $outputFile (Join-Path $runDir 'aligned.apk')
if ($LASTEXITCODE -ne 0) { throw 'Signature impossible.' }
& $java -jar (Join-Path $tools.buildTools 'lib\apksigner.jar') verify --verbose $outputFile
if ($LASTEXITCODE -ne 0) { throw 'Verification de signature impossible.' }
Write-Output ('APK verifie : ' + $outputFile)

$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$nodeBinary = if ($nodeCommand) { $nodeCommand.Source } else { Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }
& $nodeBinary (Join-Path $PSScriptRoot 'stamp-build.mjs') $outputFile $VersionCode $VersionName
if ($LASTEXITCODE -ne 0) { throw 'Empreinte de compilation impossible.' }
