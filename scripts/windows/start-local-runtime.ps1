param(
  [string]$Distro = "Ubuntu-24.04",
  [int]$TimeoutSeconds = 360
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

& wsl.exe -u root -d $Distro -e bash -lc "systemctl start docker"
if ($LASTEXITCODE -ne 0) {
  throw "WSL command failed: systemctl start docker"
}
Invoke-WslCommand -Command "'$repoRootWsl/scripts/wsl/start-local-runtime.sh' '$repoRootWsl'"

$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
$webReady = $false
$apiReady = $false

while ((Get-Date) -lt $deadline) {
  try {
    if ((Invoke-WebRequest "http://127.0.0.1:3001/api/health" -UseBasicParsing -TimeoutSec 10).StatusCode -eq 200) {
      $apiReady = $true
    }
  } catch {
    $apiReady = $false
  }

  try {
    if ((Invoke-WebRequest "http://127.0.0.1:3000/home" -UseBasicParsing -TimeoutSec 10).StatusCode -eq 200) {
      $webReady = $true
    }
  } catch {
    $webReady = $false
  }

  if ($webReady -and $apiReady) {
    break
  }

  Start-Sleep -Seconds 5
}

if (-not ($webReady -and $apiReady)) {
  throw "Local runtime did not become ready within $TimeoutSeconds seconds."
}

Write-Output "Local runtime ready: http://127.0.0.1:3000/home"
Write-Output "API health ready: http://127.0.0.1:3001/api/health"
