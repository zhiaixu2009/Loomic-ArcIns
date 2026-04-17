param(
  [string]$Distro = "Ubuntu-24.04"
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$repoRootWsl = (& wsl.exe -d $Distro -e wslpath -a $repoRoot).Trim()

if (-not $repoRootWsl) {
  throw "Unable to resolve WSL path for $repoRoot"
}

& wsl.exe -d $Distro -e bash -lc "'$repoRootWsl/scripts/wsl/status-local-runtime.sh' '$repoRootWsl'"

Write-Output ""
Write-Output "Windows localhost probes:"
Test-NetConnection 127.0.0.1 -Port 3000 | Format-List ComputerName,RemotePort,TcpTestSucceeded
Test-NetConnection 127.0.0.1 -Port 3001 | Format-List ComputerName,RemotePort,TcpTestSucceeded

try {
  $webCode = (Invoke-WebRequest "http://127.0.0.1:3000/home" -UseBasicParsing -TimeoutSec 10).StatusCode
  Write-Output "http://127.0.0.1:3000/home => $webCode"
} catch {
  Write-Output "http://127.0.0.1:3000/home => $($_.Exception.Message)"
}

try {
  $apiCode = (Invoke-WebRequest "http://127.0.0.1:3001/api/health" -UseBasicParsing -TimeoutSec 10).StatusCode
  Write-Output "http://127.0.0.1:3001/api/health => $apiCode"
} catch {
  Write-Output "http://127.0.0.1:3001/api/health => $($_.Exception.Message)"
}
