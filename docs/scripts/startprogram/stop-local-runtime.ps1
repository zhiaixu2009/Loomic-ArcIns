param(
  [string]$Distro = "Ubuntu-24.04"
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
$repoRootWsl = (& wsl.exe -d $Distro -e wslpath -a $repoRoot).Trim()

if (-not $repoRootWsl) {
  throw "Unable to resolve WSL path for $repoRoot"
}

& wsl.exe -u root -d $Distro -e bash -lc "systemctl start docker || true"
if ($LASTEXITCODE -ne 0) {
  throw "WSL command failed: systemctl start docker"
}

& wsl.exe -d $Distro -e bash -lc "bash '$repoRootWsl/docs/scripts/startprogram/wsl/stop-local-runtime.sh' '$repoRootWsl'"
if ($LASTEXITCODE -ne 0) {
  throw "WSL command failed: stop local runtime"
}

Write-Output "Local runtime stopped."
