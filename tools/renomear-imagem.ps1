<#
  Renomeia a imagem de um personagem nas duas pastas e atualiza js/config.js.

  Conferir todas as imagens (nada e alterado):
    powershell -ExecutionPolicy Bypass -File tools\renomear-imagem.ps1

  Renomear:
    powershell -ExecutionPolicy Bypass -File tools\renomear-imagem.ps1 -De gato-branco -Para mimi

  Nomes aceitos: letras minusculas sem acento, numeros e hifen.
#>
param(
  [string]$De,
  [string]$Para
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$configPath = Join-Path $root 'js\config.js'
$folders = @((Join-Path $root 'assets\pets\card'), (Join-Path $root 'assets\pets\full'))
$utf8 = New-Object System.Text.UTF8Encoding($false)

$config = [IO.File]::ReadAllText($configPath, $utf8)
$names = [regex]::Matches($config, "image:\s*'([^']+)'") | ForEach-Object { $_.Groups[1].Value }

function Test-Images {
  $problems = 0
  foreach ($name in $names) {
    foreach ($folder in $folders) {
      if (-not (Test-Path -LiteralPath (Join-Path $folder "$name.webp"))) {
        Write-Host "FALTANDO: $(Split-Path -Leaf $folder)\$name.webp"
        $problems++
      }
    }
  }
  foreach ($folder in $folders) {
    Get-ChildItem -LiteralPath $folder -Filter *.webp | Where-Object { $names -notcontains $_.BaseName } | ForEach-Object {
      Write-Host "SEM USO: $(Split-Path -Leaf $folder)\$($_.Name)"
      $problems++
    }
  }
  if ($problems -eq 0) { Write-Host "OK: $($names.Count) personagens, todas as imagens encontradas." }
  return $problems
}

if (-not $De -and -not $Para) {
  $names | ForEach-Object { Write-Host "  $_" }
  if ((Test-Images) -gt 0) { exit 1 }
  exit 0
}

if (-not $De -or -not $Para) { throw 'Informe -De e -Para juntos.' }
if ($Para -cnotmatch '^[a-z0-9]+(-[a-z0-9]+)*$') { throw "Nome invalido: '$Para'. Use letras minusculas sem acento, numeros e hifen." }
if ($names -cnotcontains $De) { throw "'$De' nao esta em js/config.js. Rode o script sem parametros para ver a lista." }
if ($names -ccontains $Para) { throw "'$Para' ja esta em uso." }

# Confere tudo antes de mexer, para nunca deixar a troca pela metade
foreach ($folder in $folders) {
  if (-not (Test-Path -LiteralPath (Join-Path $folder "$De.webp"))) { throw "Arquivo nao encontrado: $folder\$De.webp" }
  if (Test-Path -LiteralPath (Join-Path $folder "$Para.webp")) { throw "Ja existe: $folder\$Para.webp" }
}

foreach ($folder in $folders) {
  Rename-Item -LiteralPath (Join-Path $folder "$De.webp") -NewName "$Para.webp"
}
$updated = $config -creplace "image:(\s*)'$([regex]::Escape($De))'", "image:`$1'$Para'"
[IO.File]::WriteAllText($configPath, $updated, $utf8)

Write-Host "Renomeado: $De -> $Para (duas pastas e js/config.js)"
