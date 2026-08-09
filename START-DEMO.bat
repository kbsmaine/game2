@echo off
cd /d "%~dp0"
title DEADHAUL BUILD 2.6.13 SERVER
set PORT=8816
echo.
echo DEADHAUL BUILD 2.6.13 - PERSISTENT MAGAZINES + LOOSE AMMO
echo Serving at http://localhost:%PORT%
echo.
start "" "http://localhost:%PORT%/index.html?build=2.6.13"
py -m http.server %PORT%
