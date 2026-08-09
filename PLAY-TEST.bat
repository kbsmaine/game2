@echo off
cd /d "%~dp0"
title DEADHAUL BUILD 2.6.11 TEST SERVER
set PORT=8814
start "" "http://localhost:%PORT%/test-launch.html?build=2.6.11"
py -m http.server %PORT%
