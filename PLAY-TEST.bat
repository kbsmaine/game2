@echo off
cd /d "%~dp0"
title DEADHAUL BUILD 2.6.3 TEST SERVER
set PORT=8807
start "" "http://localhost:%PORT%/test-launch.html?build=2.6.3"
py -m http.server %PORT%
