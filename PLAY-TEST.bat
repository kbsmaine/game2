@echo off
cd /d "%~dp0"
title DEADHAUL BUILD 2.6.6 TEST SERVER
set PORT=8810
start "" "http://localhost:%PORT%/test-launch.html?build=2.6.6"
py -m http.server %PORT%
