@echo off
cd /d "%~dp0"
title DEADHAUL BUILD 2.6.8 SERVER
set PORT=8811
echo.
echo DEADHAUL BUILD 2.6.8 - TACTICAL CONTAINER INVENTORY
echo Serving at http://localhost:%PORT%
echo.
start "" "http://localhost:%PORT%/index.html?build=2.6.8"
py -m http.server %PORT%
