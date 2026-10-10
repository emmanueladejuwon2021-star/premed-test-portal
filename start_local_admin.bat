@echo off
title Premed Local Admin Control Center
color 0b
cd /d "%~dp0"

echo ========================================================
echo   PREMED CBT PORTAL - LOCAL ADMIN CONTROL CENTER
echo   Operating strictly on Localhost (Offline & Isolated)
echo ========================================================
echo.

:: Automatically kill any lingering node process on port 8899
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8899 ^| findstr LISTENING') do (
    echo Terminating previous instance on port 8899 (PID %%a)...
    taskkill /f /pid %%a >nul 2>&1
)

echo Starting Local Admin Server on http://localhost:8899 ...
start "" node local_admin_server.js
timeout /t 2 /nobreak >nul
start "" "http://localhost:8899"

echo.
echo ========================================================
echo  Local Admin Console is running!
echo  URL: http://localhost:8899
echo ========================================================
echo.
echo Keep this command prompt window open while using the admin console.
echo Close this window or press Ctrl+C when you are done.
echo.
pause
