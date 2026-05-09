$dir = Join-Path $PSScriptRoot '..\resources\zapret' | Resolve-Path
Get-ChildItem -Path $dir -Filter 'general*.bat' | ForEach-Object {
  $c = Get-Content $_.FullName -Raw
  $n = $c -replace 'start\s+"zapret:\s*%~n0"\s+/min\s+', ''
  if ($n -ne $c) {
    Set-Content -Path $_.FullName -Value $n -NoNewline
    Write-Host ("patched: " + $_.Name)
  } else {
    Write-Host ("skipped: " + $_.Name)
  }
}
