# Gera os ícones PNG do app (um "R" branco sobre o azul-marinho de destaque).
# Uso: powershell -ExecutionPolicy Bypass -File scripts/gerar-icones.ps1
Add-Type -AssemblyName System.Drawing

$pasta = Join-Path $PSScriptRoot '..\icones'
New-Item -ItemType Directory -Force -Path $pasta | Out-Null
$azul = [System.Drawing.Color]::FromArgb(255, 28, 59, 114)

function Gerar([int]$tamanho, [string]$nome, [double]$escalaLetra) {
  $bmp = New-Object System.Drawing.Bitmap $tamanho, $tamanho
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.TextRenderingHint = 'AntiAliasGridFit'
  $g.Clear($azul)
  $fonte = New-Object System.Drawing.Font 'Segoe UI', ([float]($tamanho * $escalaLetra)), ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
  $formato = New-Object System.Drawing.StringFormat
  $formato.Alignment = 'Center'
  $formato.LineAlignment = 'Center'
  $area = New-Object System.Drawing.RectangleF 0, ([float]($tamanho * 0.02)), $tamanho, $tamanho
  $g.DrawString('R', $fonte, [System.Drawing.Brushes]::White, $area, $formato)
  $bmp.Save((Join-Path $pasta $nome), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

Gerar 192 'icone-192.png' 0.62
Gerar 512 'icone-512.png' 0.62
Gerar 512 'icone-maskable-512.png' 0.45   # margem de segurança para ícones "maskable"
Write-Output "Arquivos gerados em $pasta"
