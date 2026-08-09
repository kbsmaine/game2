@echo off
cd /d "%~dp0"
title DEADHAUL BUILD 2.6.5 SERVER
set PORT=8809
echo.
echo DEADHAUL BUILD 2.6.5 - SOFT RAGDOLL / SPLIT SAFEHOUSE
echo Serving at http://localhost:%PORT%
echo.
start "" "http://localhost:%PORT%/index.html?build=2.6.5"
py -m http.server %PORT%
