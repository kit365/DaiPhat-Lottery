@echo off
setlocal
cd /d "%~dp0.."
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0run.ps1"
if %ERRORLEVEL% neq 0 (
    echo.
    echo Error occurred while running AI eKYC. Press any key to exit...
    pause >nul
)
