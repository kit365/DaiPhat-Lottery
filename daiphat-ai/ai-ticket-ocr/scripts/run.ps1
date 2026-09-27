# Start the AI Ticket OCR service on port 8090.
$ErrorActionPreference = "Stop"
$ServiceDir = Split-Path -Parent $PSScriptRoot
$RootDir = Split-Path -Parent $ServiceDir
# Reuse the pre-split shared daiphat-ai\.venv when present; OCR deps are several GB.
$VenvDir = Join-Path $ServiceDir ".venv"
if (-not (Test-Path (Join-Path $VenvDir "Scripts\python.exe")) -and (Test-Path (Join-Path $RootDir ".venv\Scripts\python.exe"))) {
    $VenvDir = Join-Path $RootDir ".venv"
}
$VenvPython = Join-Path $VenvDir "Scripts\python.exe"
$Port = if ($env:PORT) { $env:PORT } else { "8090" }

Set-Location $ServiceDir

foreach ($envFile in @((Join-Path $RootDir ".env"), (Join-Path $RootDir "..\.env"))) {
    if (Test-Path $envFile) {
        Get-Content $envFile | ForEach-Object {
            if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
            $pair = $_ -split '=', 2
            if ($pair.Length -eq 2 -and -not [string]::IsNullOrWhiteSpace($pair[0])) {
                $name = $pair[0].Trim()
                $value = $pair[1].Trim().Trim('"').Trim("'")
                [Environment]::SetEnvironmentVariable($name, $value, "Process")
            }
        }
        break
    }
}

if (-not (Test-Path $VenvPython)) {
    python -m venv $VenvDir
}

& $VenvPython -m pip install -q -r (Join-Path $ServiceDir "requirements.txt")

$env:PYTHONPATH = "$ServiceDir"
# Avoid PaddleOCR vs protobuf 4+/5+ descriptor crash on Windows.
$env:PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION = "python"
$Reload = if ($env:TICKET_VISION_RELOAD -eq "1") { $true } else { $false }

$existingConn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' }
if ($existingConn) {
    $pids = $existingConn | Select-Object -ExpandProperty OwningProcess -Unique
    Write-Host "Cổng $Port đang bị chiếm bởi tiến trình (PID: $($pids -join ', ')). Đang đóng tiến trình cũ..." -ForegroundColor Yellow
    foreach ($p in $pids) {
        Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Milliseconds 800
}

Write-Host "Starting ai-ticket-ocr on http://127.0.0.1:$Port (health: /health, docs: /docs)"
if ($Reload) {
    Write-Host "Reload enabled (TICKET_VISION_RELOAD=1). Prefer restart without reload if OCR hangs."
    & $VenvPython -m uvicorn main:app --app-dir $ServiceDir --host 0.0.0.0 --port $Port --reload
} else {
    # Default: no --reload. Reload + long YOLO/Groq sync work can wedge the worker so
    # /health and /v1/scan stop responding (Admin then shows LT_122 service unavailable).
    & $VenvPython -m uvicorn main:app --app-dir $ServiceDir --host 0.0.0.0 --port $Port
}
