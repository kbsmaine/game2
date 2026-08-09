@echo off
cd /d "%~dp0"
title DEADHAUL BUILD 2.6.10 TEST SERVER
set PORT=8813
start "" "http://localhost:%PORT%/test-launch.html?build=2.6.10"
py -m http.server %PORT%
