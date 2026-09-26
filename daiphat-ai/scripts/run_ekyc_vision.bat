@echo off
setlocal
cd /d "%~dp0.."
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0run_ekyc_vision.ps1"
if %ERRORLEVEL% neq 0 (
    echo.
    echo Error occurred while running eKYC Vision. Press any key to exit...
    pause >nul
)
