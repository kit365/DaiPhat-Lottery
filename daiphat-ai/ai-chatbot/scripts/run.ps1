# Start the AI Chatbot service on port 8000
$ErrorActionPreference = "Stop"
$ServiceDir = Split-Path -Parent $PSScriptRoot
$RootDir = Split-Path -Parent $ServiceDir
$VenvDir = Join-Path $ServiceDir ".venv"
if (-not (Test-Path (Join-Path $VenvDir "Scripts\python.exe")) -and (Test-Path (Join-Path $RootDir ".venv\Scripts\python.exe"))) {
    $VenvDir = Join-Path $RootDir ".venv"
}
$VenvPython = Join-Path $VenvDir "Scripts\python.exe"
$Port = if ($env:LOCAL_CHATBOT_PORT) { $env:LOCAL_CHATBOT_PORT } elseif ($env:PORT) { $env:PORT } else { "8000" }

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

$env:PYTHONPATH = "$ServiceDir"

if (-not (Test-Path $VenvPython)) {
    Write-Host "Creating Python virtual environment..."
    python -m venv $VenvDir
}

$existingConn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' }
if ($existingConn) {
    $pids = $existingConn | Select-Object -ExpandProperty OwningProcess -Unique
    Write-Host "Port $Port is busy (PID: $($pids -join ', ')). Stopping previous process..." -ForegroundColor Yellow
    foreach ($p in $pids) {
        Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Milliseconds 500
}

Write-Host "Starting AI Chatbot on http://127.0.0.1:$Port (docs: /docs)"
& $VenvPython -m uvicorn main:app --app-dir $ServiceDir --host 0.0.0.0 --port $Port --reload
