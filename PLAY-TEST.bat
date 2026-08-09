@echo off
cd /d "%~dp0"
title DEADHAUL BUILD 2.6.13 TEST SERVER
set PORT=8816
start "" "http://localhost:%PORT%/test-launch.html?build=2.6.13"
py -m http.server %PORT%
