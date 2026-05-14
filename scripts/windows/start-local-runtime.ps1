param(
  [string]$Distro = "Ubuntu-24.04",
  [int]$TimeoutSeconds = 420
)

$ErrorActionPreference = "Stop"

$target = (Resolve-Path (Join-Path $PSScriptRoot "..\..\docs\scripts\startprogram\start-local-runtime.ps1")).Path
& $target -Distro $Distro -TimeoutSeconds $TimeoutSeconds
