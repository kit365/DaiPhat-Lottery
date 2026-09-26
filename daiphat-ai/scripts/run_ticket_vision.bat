@echo off
setlocal
cd /d "%~dp0.."
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0run_ticket_vision.ps1"
if %ERRORLEVEL% neq 0 (
    echo.
    echo Error occurred while running Ticket Vision. Press any key to exit...
    pause >nul
)
