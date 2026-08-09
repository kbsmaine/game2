@echo off
cd /d "%~dp0"
title DEADHAUL BUILD 2.6.6 SERVER
set PORT=8810
echo.
echo DEADHAUL BUILD 2.6.6 - AUTHORED DEATHS / SOFT SETTLE
echo Serving at http://localhost:%PORT%
echo.
start "" "http://localhost:%PORT%/index.html?build=2.6.6"
py -m http.server %PORT%
