@echo off
cd /d "%~dp0"
title DEADHAUL BUILD 2.6.2 TEST SERVER
set PORT=8806
start "" "http://localhost:%PORT%/test-launch.html?build=2.6.2"
py -m http.server %PORT%
