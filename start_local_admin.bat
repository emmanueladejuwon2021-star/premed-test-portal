@echo off
title Premed Local Admin Control Center
color 0b

:: Ensure current working directory is this folder
cd /d "%~dp0"

echo ========================================================
echo   PREMED CBT PORTAL - LOCAL ADMIN CONTROL CENTER
echo   Operating strictly on Localhost (Offline & Isolated)
echo ========================================================
echo.

:: Stop any old background server on port 8080
taskkill /F /IM php.exe >nul 2>&1

set PHP_BIN=php
if exist "C:\xampp\php\php.exe" (
    set PHP_BIN=C:\xampp\php\php.exe
)

echo Target Folder: %~dp0
echo Starting Local Admin Server on http://localhost:8080 ...

:: Run PHP built-in server with explicit document root folder
start "" "%PHP_BIN%" -S localhost:8080 -t "%~dp0"
timeout /t 2 /nobreak >nul
start "" "http://localhost:8080/admin_dashboard.php"

echo.
echo ========================================================
echo  Local Admin Console is running!
echo  URL: http://localhost:8080/admin_dashboard.php
echo ========================================================
echo.
echo Keep this command prompt window open while using the admin console.
echo Press any key to stop the local admin server...
pause >nul
taskkill /F /IM php.exe >nul 2>&1
