# Runs every end-to-end QA suite against the running local stack and prints a summary.
param([switch]$ApiOnly)
$ErrorActionPreference = "Continue"
Set-Location $PSScriptRoot

$suites = @(Get-ChildItem api\api_*.py | Sort-Object Name | ForEach-Object { @{ Name = $_.Name; Cmd = "python"; Arg = $_.FullName } })
if (-not $ApiOnly) {
    $suites += @(Get-ChildItem ui\ui_*.js | Sort-Object Name | ForEach-Object { @{ Name = $_.Name; Cmd = "node"; Arg = $_.FullName } })
}

$summary = @()
foreach ($s in $suites) {
    Write-Host "`n=== $($s.Name)" -ForegroundColor Cyan
    $out = & $s.Cmd $s.Arg 2>&1 | ForEach-Object { "$_" }
    $out | ForEach-Object { Write-Host $_ }
    $result = ($out | Select-String -Pattern "RESULT:?\s*\d+/\d+" | Select-Object -Last 1)
    if ($result) { $text = $result.Matches[0].Value }
    else {
        # short suites print only PASS/FAIL lines
        $pass = @($out | Where-Object { $_ -match "^\s*PASS" }).Count
        $fail = @($out | Where-Object { $_ -match "^\s*FAIL" }).Count
        $text = if ($pass + $fail) { "RESULT $pass/$($pass + $fail)" } else { "no result (exit $LASTEXITCODE)" }
    }
    $summary += [pscustomobject]@{ Suite = $s.Name; Result = $text }
}

Write-Host "`n=== Summary" -ForegroundColor Cyan
$summary | Format-Table -AutoSize
