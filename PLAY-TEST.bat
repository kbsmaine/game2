@echo off
cd /d "%~dp0"
title DEADHAUL BUILD 2.6.0 TEST SERVER
set PORT=8804
start "" "http://localhost:%PORT%/test-launch.html?build=2.6.0"
py -m http.server %PORT%
