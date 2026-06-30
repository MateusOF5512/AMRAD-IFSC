# Renomeia pastas 3D_ION_* para AMRAD_* (feche servidores dev e reabra o Cursor depois)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

if (Test-Path '3D_ION_BACKEND') {
  Rename-Item -Path '3D_ION_BACKEND' -NewName 'AMRAD_BACKEND'
  Write-Host 'Renamed 3D_ION_BACKEND -> AMRAD_BACKEND'
}

if (Test-Path '3D_ION_FRONTEND') {
  Rename-Item -Path '3D_ION_FRONTEND' -NewName 'AMRAD_FRONTEND'
  Write-Host 'Renamed 3D_ION_FRONTEND -> AMRAD_FRONTEND'
}

$parent = Split-Path -Parent $root
$folderName = Split-Path -Leaf $root
if ($folderName -eq '3D_ION' -and -not (Test-Path (Join-Path $parent 'AMRAD'))) {
  Set-Location $parent
  Rename-Item -Path '3D_ION' -NewName 'AMRAD'
  Write-Host 'Renamed 3D_ION -> AMRAD (raiz do projeto)'
}

Write-Host 'Concluído. Reabra o workspace em AMRAD/'
