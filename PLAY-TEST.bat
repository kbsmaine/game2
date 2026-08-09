@echo off
cd /d "%~dp0"
title DEADHAUL BUILD 2.6.12 TEST SERVER
set PORT=8815
start "" "http://localhost:%PORT%/test-launch.html?build=2.6.12"
py -m http.server %PORT%
