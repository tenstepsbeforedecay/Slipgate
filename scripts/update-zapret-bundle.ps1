$ErrorActionPreference = 'Stop'
$tag = '1.9.8c'
$url = "https://github.com/Flowseal/zapret-discord-youtube/releases/download/$tag/zapret-discord-youtube-$tag.zip"
$zipPath = Join-Path $env:TEMP "zapret-$tag.zip"
$tmpDir = Join-Path $env:TEMP "zapret-$tag-extract"
$dest = Join-Path $PSScriptRoot '..\resources\zapret'
$dest = (Resolve-Path $dest).Path

Write-Host "Downloading $url"
Invoke-WebRequest -Uri $url -OutFile $zipPath -UseBasicParsing
Write-Host ("Downloaded: " + (Get-Item $zipPath).Length + " bytes")

if (Test-Path $tmpDir) { Remove-Item -Recurse -Force $tmpDir }
Expand-Archive -Path $zipPath -DestinationPath $tmpDir -Force

# Wipe the existing bundle except for any user-specific files we don't ship
Get-ChildItem $dest -Force | ForEach-Object {
    Remove-Item -Recurse -Force $_.FullName
}

# Copy fresh contents
Get-ChildItem $tmpDir -Force | ForEach-Object {
    Copy-Item -Recurse -Force $_.FullName -Destination $dest
}

Write-Host "Bundle written to: $dest"
Get-ChildItem $dest | Format-Table Name,Length

# Strip `start "zapret: %~n0" /min ` from every general*.bat so winws.exe
# launches as a direct child of cmd.exe (which Slipgate spawns with
# windowsHide:true). Without this patch each bat would pop a visible
# console window on every Zapret start AND on every strategy-test spawn.
& (Join-Path $PSScriptRoot 'patch-zapret.ps1')

Remove-Item -Force $zipPath
Remove-Item -Recurse -Force $tmpDir
