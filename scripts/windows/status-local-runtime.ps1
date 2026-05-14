param(
  [string]$Distro = "Ubuntu-24.04"
)

$ErrorActionPreference = "Stop"

$target = (Resolve-Path (Join-Path $PSScriptRoot "..\..\docs\scripts\startprogram\status-local-runtime.ps1")).Path
& $target -Distro $Distro
