$ErrorActionPreference = 'Stop'
$portableNode = Join-Path $PSScriptRoot '..\..\.tools\node-v24.21.0-win-x64'
if (Test-Path (Join-Path $portableNode 'node.exe')) { $env:Path = "$portableNode;$env:Path" }
Set-Location -LiteralPath $PSScriptRoot
if (-not (Test-Path 'node_modules')) { & npm.cmd ci; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } }
& npm.cmd start -- --go --clear --port 8082
