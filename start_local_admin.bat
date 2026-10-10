@echo off
title Premed Local Admin Control Center
color 0b

:: Move to this script's directory
cd /d "%~dp0"

echo ========================================================
echo   PREMED CBT PORTAL - LOCAL ADMIN CONTROL CENTER
echo   Operating strictly on Localhost (Offline & Isolated)
echo ========================================================
echo.

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
