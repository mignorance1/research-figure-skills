param(
    [Parameter(Mandatory=$true)][string]$Source,
    [Parameter(Mandatory=$true)][string]$Destination,
    [ValidateRange(800,10000)][int]$Width = 2560
)
$ErrorActionPreference = 'Stop'
$sourcePath = (Resolve-Path -LiteralPath $Source).Path
if ([IO.Path]::GetExtension($sourcePath) -ne '.pptx') { throw 'Source must be a PPTX.' }
$destinationPath = [IO.Path]::GetFullPath($Destination)
[void][IO.Directory]::CreateDirectory($destinationPath)
$pdfPath = Join-Path $destinationPath 'figure.pdf'
if ($sourcePath -eq $pdfPath) { throw 'Source and output must differ.' }
$sourceHash = (Get-FileHash -LiteralPath $sourcePath -Algorithm SHA256).Hash.ToLowerInvariant()
$existingPowerPoint = @(Get-Process -Name POWERPNT -ErrorAction SilentlyContinue).Count -gt 0
$app = $null
$deck = $null
$exports = @()
try {
    $app = New-Object -ComObject PowerPoint.Application
    # ReadOnly=true, Untitled=false, WithWindow=false.
    $deck = $app.Presentations.Open($sourcePath, -1, 0, 0)
    # ppSaveAsPDF=32 avoids ExportAsFixedFormat optional-argument COM quirks.
    $deck.SaveAs($pdfPath, 32)
    $height = [int]($Width * $deck.PageSetup.SlideHeight / $deck.PageSetup.SlideWidth)
    for ($i = 1; $i -le $deck.Slides.Count; $i++) {
        $pngPath = Join-Path $destinationPath ('slide-' + $i + '.png')
        $deck.Slides.Item($i).Export($pngPath, 'PNG', $Width, $height)
        $exports += @{file=[IO.Path]::GetFileName($pngPath); sha256=(Get-FileHash -LiteralPath $pngPath -Algorithm SHA256).Hash.ToLowerInvariant()}
    }
    $exports += @{file='figure.pdf'; sha256=(Get-FileHash -LiteralPath $pdfPath -Algorithm SHA256).Hash.ToLowerInvariant()}
    $record = @{
        source=[IO.Path]::GetFileName($sourcePath); source_sha256=$sourceHash
        slides=$deck.Slides.Count; width_pt=$deck.PageSetup.SlideWidth
        height_pt=$deck.PageSetup.SlideHeight; renderer='Microsoft PowerPoint'
        exports=$exports; visual_review_required=$true
    }
    $jsonPath = Join-Path $destinationPath 'export.json'
    [IO.File]::WriteAllText($jsonPath, ($record | ConvertTo-Json -Depth 6), (New-Object Text.UTF8Encoding($false)))
} finally {
    if ($null -ne $deck) { $deck.Close(); [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($deck) }
    if ($null -ne $app) {
        if (-not $existingPowerPoint) { $app.Quit() }
        [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($app)
    }
}
if ((Get-FileHash -LiteralPath $sourcePath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $sourceHash) {
    throw 'Source changed during export; inspect before continuing.'
}
Write-Output ('Exported PDF and previews: ' + $destinationPath)
