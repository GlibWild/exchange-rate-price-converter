<#
生成 Edge 加载项商店素材：300x300 商店图标、440x280 促销图。
用法：powershell -ExecutionPolicy Bypass -File scripts/make-store-assets.ps1
#>

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$store = Join-Path $root 'store'
New-Item -ItemType Directory -Path $store -Force | Out-Null

function New-RoundedPath {
    param([float]$X, [float]$Y, [float]$Width, [float]$Height, [float]$Radius)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $Radius * 2
    $path.AddArc($X, $Y, $d, $d, 180, 90)
    $path.AddArc($X + $Width - $d, $Y, $d, $d, 270, 90)
    $path.AddArc($X + $Width - $d, $Y + $Height - $d, $d, $d, 0, 90)
    $path.AddArc($X, $Y + $Height - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    return $path
}

function New-GradientBrush {
    param([float]$X, [float]$Y, [float]$Width, [float]$Height)
    $rect = New-Object System.Drawing.RectangleF($X, $Y, $Width, $Height)
    return New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $rect,
        [System.Drawing.Color]::FromArgb(255, 10, 112, 68),
        [System.Drawing.Color]::FromArgb(255, 18, 166, 103),
        40.0
    )
}

# ---------- 商店图标 300x300 ----------
$size = 300
$icon = New-Object System.Drawing.Bitmap($size, $size)
$iconGraphics = [System.Drawing.Graphics]::FromImage($icon)
$iconGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$iconGraphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$iconGraphics.Clear([System.Drawing.Color]::Transparent)

$iconPath = New-RoundedPath 0 0 $size $size 62
$iconBrush = New-GradientBrush 0 0 $size $size
$iconGraphics.FillPath($iconBrush, $iconPath)

$ringPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(46, 255, 255, 255), 3)
$iconGraphics.DrawEllipse($ringPen, 52, 52, 196, 196)

$iconFont = New-Object System.Drawing.Font('Microsoft YaHei', 158, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$iconFormat = New-Object System.Drawing.StringFormat
$iconFormat.Alignment = [System.Drawing.StringAlignment]::Center
$iconFormat.LineAlignment = [System.Drawing.StringAlignment]::Center
$iconRect = New-Object System.Drawing.RectangleF(0, 4, $size, $size)
$iconGraphics.DrawString('¥', $iconFont, [System.Drawing.Brushes]::White, $iconRect, $iconFormat)

$icon.Save((Join-Path $store 'logo-300.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$iconGraphics.Dispose(); $icon.Dispose(); $iconFont.Dispose(); $iconBrush.Dispose(); $iconPath.Dispose(); $ringPen.Dispose(); $iconFormat.Dispose()

# ---------- 促销图 440x280 ----------
$width = 440
$height = 280
$promo = New-Object System.Drawing.Bitmap($width, $height)
$promoGraphics = [System.Drawing.Graphics]::FromImage($promo)
$promoGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$promoGraphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$promoGraphics.Clear([System.Drawing.Color]::FromArgb(255, 8, 74, 47))

$background = New-GradientBrush 0 0 $width $height
$promoGraphics.FillRectangle($background, 0, 0, $width, $height)

# 装饰性大号货币符号
$decorFont = New-Object System.Drawing.Font('Microsoft YaHei', 230, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$decorBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(26, 255, 255, 255))
$promoGraphics.DrawString('¥', $decorFont, $decorBrush, 268, -18)

$titleFont = New-Object System.Drawing.Font('Microsoft YaHei', 28, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$subtitleFont = New-Object System.Drawing.Font('Microsoft YaHei', 15, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$sampleFont = New-Object System.Drawing.Font('Microsoft YaHei', 19, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$sampleSmallFont = New-Object System.Drawing.Font('Microsoft YaHei', 17, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$hintFont = New-Object System.Drawing.Font('Microsoft YaHei', 12, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)

$white = [System.Drawing.Brushes]::White
$softWhite = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(210, 255, 255, 255))
$mint = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 154, 235, 198))

$promoGraphics.DrawString('汇率价格转换器', $titleFont, $white, 28, 42)
$promoGraphics.DrawString('网页价格自动换算显示', $subtitleFont, $softWhite, 30, 88)

$cardPath = New-RoundedPath 28 118 384 82 14
$cardBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(235, 255, 255, 255))
$promoGraphics.FillPath($cardBrush, $cardPath)

$darkBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 31, 41, 55))
$promoGraphics.DrawString('$999.00', $sampleSmallFont, $darkBrush, 46, 141)
$promoGraphics.DrawString('→', $sampleSmallFont, $darkBrush, 148, 141)
$promoGraphics.DrawString('≈ ¥7,112.88', $sampleFont, $mint, 186, 139)

$promoGraphics.DrawString('支持 40+ 种货币 · 动态页面自动识别', $hintFont, $softWhite, 30, 224)

$promo.Save((Join-Path $store 'promo-440x280.png'), [System.Drawing.Imaging.ImageFormat]::Png)

$promoGraphics.Dispose(); $promo.Dispose(); $background.Dispose(); $decorFont.Dispose(); $decorBrush.Dispose()
$titleFont.Dispose(); $subtitleFont.Dispose(); $sampleFont.Dispose(); $sampleSmallFont.Dispose(); $hintFont.Dispose()
$softWhite.Dispose(); $mint.Dispose(); $darkBrush.Dispose(); $cardBrush.Dispose(); $cardPath.Dispose()

Write-Output '已生成 store/logo-300.png 与 store/promo-440x280.png'
