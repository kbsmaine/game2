@echo off
cd /d "%~dp0"
title DEADHAUL BUILD 2.6.4 SERVER
set PORT=8808
echo.
echo DEADHAUL BUILD 2.6.4 - SHOOTER DEATH DROP / SPLIT SAFEHOUSE
echo Serving at http://localhost:%PORT%
echo.
start "" "http://localhost:%PORT%/index.html?build=2.6.4"
py -m http.server %PORT%
