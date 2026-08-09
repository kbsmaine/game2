@echo off
cd /d "%~dp0"
title DEADHAUL BUILD 2.6.4 TEST SERVER
set PORT=8808
start "" "http://localhost:%PORT%/test-launch.html?build=2.6.4"
py -m http.server %PORT%
