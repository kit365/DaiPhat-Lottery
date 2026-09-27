# Start the AI eKYC service on port 8091
$ErrorActionPreference = "Stop"
$ServiceDir = Split-Path -Parent $PSScriptRoot
$RootDir = Split-Path -Parent $ServiceDir
# Reuse the pre-split shared daiphat-ai\.venv when present; Paddle/InsightFace deps are large.
$VenvDir = Join-Path $ServiceDir ".venv"
if (-not (Test-Path (Join-Path $VenvDir "Scripts\python.exe")) -and (Test-Path (Join-Path $RootDir ".venv\Scripts\python.exe"))) {
    $VenvDir = Join-Path $RootDir ".venv"
}
$VenvPython = Join-Path $VenvDir "Scripts\python.exe"
$Port = if ($env:LOCAL_EKYC_VISION_PORT) { $env:LOCAL_EKYC_VISION_PORT } elseif ($env:PORT) { $env:PORT } else { "8091" }

Set-Location $ServiceDir

foreach ($envFile in @((Join-Path $RootDir ".env"), (Join-Path $RootDir "..\.env"), (Join-Path $ServiceDir ".env"))) {
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

if (-not $env:KYC_AI_API_KEY) {
    $env:KYC_AI_API_KEY = "dev-kyc-ai-secret"
}

$env:PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION = "python"
$env:PYTHONPATH = "$ServiceDir"

if (-not (Test-Path $VenvPython)) {
    Write-Host "Creating Python virtual environment..."
    python -m venv $VenvDir
}

$existingConn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' }
if ($existingConn) {
    $pids = $existingConn | Select-Object -ExpandProperty OwningProcess -Unique
    Write-Host "Cổng $Port đang bị chiếm bởi tiến trình (PID: $($pids -join ', ')). Đang đóng tiến trình cũ..." -ForegroundColor Yellow
    foreach ($p in $pids) {
        Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Milliseconds 800
}

Write-Host "Starting ai-ekyc on http://127.0.0.1:$Port (health: /health, docs: /docs)"
$Reload = if ($env:EKYC_VISION_RELOAD -eq "1") { $true } else { $false }
if ($Reload) {
    Write-Host "Reload enabled (EKYC_VISION_RELOAD=1). Prefer restart without reload if face/OCR hangs."
    & $VenvPython -m uvicorn app.main:app --app-dir $ServiceDir --host 0.0.0.0 --port $Port --reload
} else {
    # Default: no --reload. Reload + torch/InsightFace on Windows often breaks shm.dll loading
    # (WinError 127) and can wedge the worker so OCR/face calls become flaky.
    & $VenvPython -m uvicorn app.main:app --app-dir $ServiceDir --host 0.0.0.0 --port $Port
}
