@echo off
cd /d "%~dp0"
title DEADHAUL BUILD 2.6.10 SERVER
set PORT=8813
echo.
echo DEADHAUL BUILD 2.6.10 - ADMIN TEST PANEL + TACTICAL INVENTORY
echo Serving at http://localhost:%PORT%
echo.
start "" "http://localhost:%PORT%/index.html?build=2.6.10"
py -m http.server %PORT%
