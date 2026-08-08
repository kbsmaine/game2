@echo off
cd /d "%~dp0"
title DEADHAUL BUILD 2.6.1 SERVER
set PORT=8805
echo.
echo DEADHAUL BUILD 2.6.1 - PHYSICS RAGDOLL / SPLIT SAFEHOUSE
echo Serving at http://localhost:%PORT%
echo.
start "" "http://localhost:%PORT%/index.html?build=2.6.1"
py -m http.server %PORT%
