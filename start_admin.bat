@echo off
title Premed Admin Command Center
cd /d "%~dp0"
echo ======================================================================
echo             PREMED TEST PORTAL - ADMIN COMMAND CENTER
echo ======================================================================
echo.
echo Starting local admin server on http://localhost:8899 ...
echo Connecting with live database and synchronizing student activities...
echo.
node local_admin_server.js
pause
