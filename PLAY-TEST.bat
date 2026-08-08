@echo off
cd /d "%~dp0"
title DEADHAUL BUILD 2.6.1 TEST SERVER
set PORT=8805
start "" "http://localhost:%PORT%/test-launch.html?build=2.6.1"
py -m http.server %PORT%
