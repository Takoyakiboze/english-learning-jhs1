$ErrorActionPreference = 'Stop'
$toolRoot = Join-Path $PSScriptRoot '..\.tools'
$gitBin = Join-Path $toolRoot 'mingit-2.56.0.3\cmd'
$ghBin = Join-Path $toolRoot 'gh-2.103.2\bin'
if (Test-Path -LiteralPath $gitBin) { $env:Path = "$gitBin;$env:Path" }
if (Test-Path -LiteralPath $ghBin) { $env:Path = "$ghBin;$env:Path" }
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  throw 'Install GitHub CLI first: https://cli.github.com/'
}
Set-Location -LiteralPath $PSScriptRoot
& gh auth login --hostname github.com --git-protocol https --web --scopes workflow
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$login = & gh api user --jq .login
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
if ($login -ne 'Takoyakiboze') { throw "Expected Takoyakiboze; authenticated as $login." }
Write-Output 'GitHub authentication completed for Takoyakiboze. The app has not been pushed by this script.'
