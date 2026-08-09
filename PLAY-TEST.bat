@echo off
cd /d "%~dp0"
title DEADHAUL BUILD 2.6.8 TEST SERVER
set PORT=8811
start "" "http://localhost:%PORT%/test-launch.html?build=2.6.8"
py -m http.server %PORT%
