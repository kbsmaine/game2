@echo off
cd /d "%~dp0"
title DEADHAUL BUILD 2.6.11 SERVER
set PORT=8814
echo.
echo DEADHAUL BUILD 2.6.11 - BUNKER INVENTORY + CATEGORIZED STASH
echo Serving at http://localhost:%PORT%
echo.
start "" "http://localhost:%PORT%/index.html?build=2.6.11"
py -m http.server %PORT%
