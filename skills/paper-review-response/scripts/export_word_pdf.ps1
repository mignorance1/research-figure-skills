param(
    [Parameter(Mandatory=$true)][string]$Source,
    [Parameter(Mandatory=$true)][string]$Destination
)
$ErrorActionPreference = 'Stop'
$taskSource = (Resolve-Path -LiteralPath $Source).Path
if ([IO.Path]::GetExtension($taskSource) -ine '.docx') { throw 'Source must be a DOCX file.' }
$taskPdf = [IO.Path]::GetFullPath($Destination)
if ([IO.Path]::GetExtension($taskPdf) -ine '.pdf') { throw 'Destination must be a PDF file.' }
if ([string]::Equals($taskSource,$taskPdf,[StringComparison]::OrdinalIgnoreCase)) { throw 'Source and destination must differ.' }
$taskDirectory = [IO.Path]::GetDirectoryName($taskPdf)
if (-not (Test-Path -LiteralPath $taskDirectory)) { [void][IO.Directory]::CreateDirectory($taskDirectory) }
$taskBefore = (Get-FileHash -LiteralPath $taskSource -Algorithm SHA256).Hash
$taskExistingWord = @(Get-Process -Name WINWORD -ErrorAction SilentlyContinue).Count -gt 0
$taskApp = $null
$taskDocument = $null
$taskPages = $null
try {
    $taskApp = New-Object -ComObject Word.Application
    $taskApp.Visible = $false
    $taskApp.DisplayAlerts = 0
    $taskDocument = $taskApp.Documents.Open($taskSource,$false,$true,$false)
    [void]$taskDocument.Fields.Update()
    $taskDocument.Repaginate()
    $taskPages = $taskDocument.ComputeStatistics(2)
    $taskDocument.ExportAsFixedFormat($taskPdf,17)
} finally {
    if ($null -ne $taskDocument) {
        $taskDocument.Close(0)
        [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($taskDocument)
    }
    if ($null -ne $taskApp) {
        if (-not $taskExistingWord) { $taskApp.Quit(0) }
        [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($taskApp)
    }
}
$taskAfter = (Get-FileHash -LiteralPath $taskSource -Algorithm SHA256).Hash
if ($taskAfter -ne $taskBefore) { throw 'Source DOCX changes during read-only export.' }
if (-not (Test-Path -LiteralPath $taskPdf) -or (Get-Item -LiteralPath $taskPdf).Length -eq 0) { throw 'Word does not produce a nonempty PDF.' }
$taskRecord = [ordered]@{
    source = $taskSource
    source_sha256 = $taskAfter
    destination = $taskPdf
    destination_sha256 = (Get-FileHash -LiteralPath $taskPdf -Algorithm SHA256).Hash
    pages = $taskPages
    source_unchanged = $true
    native_word_export = $true
}
$taskRecordPath = [IO.Path]::ChangeExtension($taskPdf,'.export.json')
$taskRecord | ConvertTo-Json | Set-Content -LiteralPath $taskRecordPath -Encoding UTF8
$taskRecord | ConvertTo-Json
