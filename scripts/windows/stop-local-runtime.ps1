param(
  [string]$Distro = "Ubuntu-24.04"
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$repoRootWsl = (& wsl.exe -d $Distro -e wslpath -a $repoRoot).Trim()

if (-not $repoRootWsl) {
  throw "Unable to resolve WSL path for $repoRoot"
}

function Invoke-WslCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Command,
    [switch]$AsRoot
  )

  $arguments = @("-d", $Distro)
  if ($AsRoot) {
    $arguments += @("-u", "root")
  }
  $arguments += @("-e", "bash", "-lc", $Command)

  & wsl.exe @arguments
  if ($LASTEXITCODE -ne 0) {
    throw "WSL command failed: $Command"
  }
}

& wsl.exe -u root -d $Distro -e bash -lc "systemctl start docker || true"
if ($LASTEXITCODE -ne 0) {
  throw "WSL command failed: systemctl start docker"
}
Invoke-WslCommand -Command "'$repoRootWsl/scripts/wsl/stop-local-runtime.sh' '$repoRootWsl'"

Write-Output "Local runtime stopped."
