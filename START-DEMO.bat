@echo off
cd /d "%~dp0"
title DEADHAUL BUILD 2.6.2 SERVER
set PORT=8806
echo.
echo DEADHAUL BUILD 2.6.2 - STABLE RAGDOLL / SPLIT SAFEHOUSE
echo Serving at http://localhost:%PORT%
echo.
start "" "http://localhost:%PORT%/index.html?build=2.6.2"
py -m http.server %PORT%
