# Start ticket-vision OCR service on port 8090 (chat-bot is a separate process on 8000).
$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $PSScriptRoot
$ServiceDir = Join-Path $RootDir "services\ticket-vision"
$VenvPython = Join-Path $RootDir ".venv\Scripts\python.exe"
$Port = if ($env:PORT) { $env:PORT } else { "8090" }

Set-Location $RootDir

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
    python -m venv (Join-Path $RootDir ".venv")
}

& $VenvPython -m pip install -q -r (Join-Path $ServiceDir "requirements.txt")

$env:PYTHONPATH = "$RootDir;$ServiceDir"
Write-Host "Starting ticket-vision on http://127.0.0.1:$Port (health: /health, docs: /docs)"
& $VenvPython -m uvicorn main:app --app-dir $ServiceDir --host 0.0.0.0 --port $Port --reload
