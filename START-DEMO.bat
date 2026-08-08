@echo off
cd /d "%~dp0"
title DEADHAUL BUILD 2.6.0 SERVER
set PORT=8804
echo.
echo DEADHAUL BUILD 2.6.0 - SAFEHOUSE / STASH / BODY PASS
echo Serving at http://localhost:%PORT%
echo.
start "" "http://localhost:%PORT%/index.html?build=2.6.0"
py -m http.server %PORT%
