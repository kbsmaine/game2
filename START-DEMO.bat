@echo off
cd /d "%~dp0"
title DEADHAUL BUILD 2.6.3 SERVER
set PORT=8807
echo.
echo DEADHAUL BUILD 2.6.3 - ANATOMICAL RAGDOLL / SPLIT SAFEHOUSE
echo Serving at http://localhost:%PORT%
echo.
start "" "http://localhost:%PORT%/index.html?build=2.6.3"
py -m http.server %PORT%
