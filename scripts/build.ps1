# 构建 Edge 扩展安装包（zip），输出到 dist/
# 用法：powershell -ExecutionPolicy Bypass -File scripts/build.ps1

param(
    [string]$Version = ''
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$manifestPath = Join-Path $root 'manifest.json'
if (-not (Test-Path $manifestPath)) {
    throw "未找到 manifest.json：$manifestPath"
}

$manifest = Get-Content $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
if ([string]::IsNullOrWhiteSpace($Version)) {
    $Version = $manifest.version
}

$dist = Join-Path $root 'dist'
$staging = Join-Path $dist 'staging'
$zipPath = Join-Path $dist "exchange-rate-price-converter-$Version.zip"

if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

New-Item -ItemType Directory -Path $staging -Force | Out-Null

# 需要打包进扩展的运行时文件
$files = @(
    'manifest.json',
    'background.js',
    'currencies.js',
    'parser.js',
    'content.js',
    'content.css',
    'popup.html',
    'popup.css',
    'popup.js',
    'LICENSE'
)

foreach ($file in $files) {
    $source = Join-Path $root $file
    if (-not (Test-Path $source)) {
        throw "缺少打包文件：$file"
    }
    Copy-Item $source -Destination $staging -Force
}

$iconsSource = Join-Path $root 'icons'
if (-not (Test-Path $iconsSource)) {
    throw '缺少 icons 目录'
}
Copy-Item $iconsSource -Destination $staging -Recurse -Force

# 校验清单中被引用的资源都存在
$referenced = @()
$referenced += $manifest.background.service_worker
$referenced += $manifest.action.default_popup
$referenced += $manifest.content_scripts[0].js
$referenced += $manifest.content_scripts[0].css
$referenced += $manifest.icons.PSObject.Properties.Value
$referenced += $manifest.action.default_icon.PSObject.Properties.Value

foreach ($item in ($referenced | Select-Object -Unique)) {
    $target = Join-Path $staging $item
    if (-not (Test-Path $target)) {
        throw "清单引用的文件未打包：$item"
    }
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    $entries = Get-ChildItem $staging -Recurse -File | Sort-Object { if ($_.Name -eq 'manifest.json') { 0 } else { 1 } }, FullName
    foreach ($entry in $entries) {
        $relative = $entry.FullName.Substring($staging.Length + 1).Replace('\', '/')
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
            $archive,
            $entry.FullName,
            $relative,
            [System.IO.Compression.CompressionLevel]::Optimal
        ) | Out-Null
    }
} finally {
    $archive.Dispose()
}

Remove-Item $staging -Recurse -Force

$zip = Get-Item $zipPath
Write-Output "构建完成：$($zip.FullName)"
Write-Output "包大小：$([math]::Round($zip.Length / 1KB, 1)) KB"
Write-Output "版本：$Version"
