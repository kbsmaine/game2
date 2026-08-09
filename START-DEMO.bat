@echo off
cd /d "%~dp0"
title DEADHAUL BUILD 2.6.12 SERVER
set PORT=8815
echo.
echo DEADHAUL BUILD 2.6.12 - PERSISTENT MAGAZINES + LOOSE AMMO
echo Serving at http://localhost:%PORT%
echo.
start "" "http://localhost:%PORT%/index.html?build=2.6.12"
py -m http.server %PORT%
