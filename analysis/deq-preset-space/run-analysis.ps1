param(
  [switch]$SkipFetch,
  [string]$Python = "",
  [string]$Node = ""
)

$ErrorActionPreference = "Stop"
$analysisRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = (Resolve-Path (Join-Path $analysisRoot "..\..")).Path

function Resolve-Executable([string]$Requested, [string]$CommandName, [string]$BundledPath) {
  if ($Requested) {
    if (-not (Test-Path -LiteralPath $Requested)) { throw "Executable not found: $Requested" }
    return (Resolve-Path -LiteralPath $Requested).Path
  }
  $command = Get-Command $CommandName -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }
  if (Test-Path -LiteralPath $BundledPath) { return $BundledPath }
  throw "Could not find $CommandName. Pass its full path with -$($CommandName.Substring(0,1).ToUpper()+$CommandName.Substring(1))."
}

$userRoot = [Environment]::GetFolderPath("UserProfile")
if (-not $userRoot) { $userRoot = $env:USERPROFILE }
if (-not $userRoot) {
  $userPathMatch = [regex]::Match($repoRoot, "^[A-Za-z]:\\Users\\[^\\]+")
  if ($userPathMatch.Success) { $userRoot = $userPathMatch.Value }
}
if (-not $userRoot) { throw "Could not resolve the current user directory." }
if (-not $SkipFetch) {
  $nodePath = Resolve-Executable $Node "node" (Join-Path $userRoot ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe")
}
$pythonPath = Resolve-Executable $Python "python" (Join-Path $userRoot ".cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe")

Push-Location $repoRoot
try {
  if (-not $SkipFetch) { & $nodePath (Join-Path $analysisRoot "fetch-presets.mjs") }
  & $pythonPath (Join-Path $analysisRoot "analyze.py")
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
  Pop-Location
}
