param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$CmdPath,
  [Parameter(Mandatory = $true, Position = 1)]
  [string]$ArgsFile
)

$cmd = $CmdPath
if (-not $cmd) {
  Write-Error "CmdPath is not set."
  exit 1
}

$argPayload = Get-Content -Path $ArgsFile -Raw | ConvertFrom-Json
$rest = @()
if ($null -ne $argPayload) {
  if ($argPayload -is [System.Array]) {
    $rest = [string[]]$argPayload
  } else {
    $rest = [string[]]@([string]$argPayload)
  }
}

& $cmd @rest
exit $LASTEXITCODE
