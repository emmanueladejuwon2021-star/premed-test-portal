@echo off
title Premed Local Admin Control Center
color 0b
echo ========================================================
echo   PREMED CBT PORTAL - LOCAL ADMIN CONTROL CENTER
echo   Operating strictly on Localhost (Offline & Isolated)
echo ========================================================
echo.

set PHP_BIN=php
if exist "C:\xampp\php\php.exe" (
    set PHP_BIN=C:\xampp\php\php.exe
)

echo Starting Local Administrative Server on http://localhost:8080 ...
start "" "%PHP_BIN%" -S localhost:8080
timeout /t 2 /nobreak >nul
start "" "http://localhost:8080/admin_dashboard.php"

echo.
echo Local Admin Console is active in your browser!
echo URL: http://localhost:8080/admin_dashboard.php
echo.
echo Leave this window open while managing the portal.
echo Press any key to stop the local admin server...
pause >nul
taskkill /F /IM php.exe >nul 2>&1
