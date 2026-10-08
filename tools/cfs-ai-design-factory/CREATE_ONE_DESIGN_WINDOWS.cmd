@echo off
setlocal
cd /d "%~dp0"
if not defined CFS_AI_BASE_URL set "CFS_AI_BASE_URL=http://127.0.0.1:8000"
py -3 design_factory.py once --root "%~dp0..\.." %*
pause
