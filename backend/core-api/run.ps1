# PowerShell script to load .env and start core-api on Windows
Write-Host "Checking port 8080..." -ForegroundColor Cyan

$portProcess = Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue
if ($portProcess) {
    Write-Host "Killing previous process on port 8080..." -ForegroundColor Yellow
    Stop-Process -Id $portProcess.OwningProcess -Force -ErrorAction SilentlyContinue
} else {
    Write-Host "Port 8080 is free" -ForegroundColor Green
}

if (Test-Path ".env") {
    Write-Host "Loading environment variables from .env..." -ForegroundColor Cyan
    Get-Content ".env" | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#")) {
            $parts = $line.Split("=", 2)
            if ($parts.Length -eq 2) {
                $name = $parts[0].Trim()
                $value = $parts[1].Trim()
                [System.Environment]::SetEnvironmentVariable($name, $value, "Process")
            }
        }
    }
}

Write-Host "Starting core-api Spring Boot server..." -ForegroundColor Green
.\mvnw.cmd spring-boot:run
