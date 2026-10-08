@echo off
setlocal
cd /d "%~dp0"
if not defined CFS_AI_BASE_URL set "CFS_AI_BASE_URL=http://127.0.0.1:8000"
echo CFS AI Design Factory - Hintergrund-Erstellung neuer Entwuerfe.
echo Der PC und der CFS-AI-Dienst muessen laufen. Keine automatische Veroeffentlichung.
py -3 design_factory.py worker --root "%~dp0..\.." %*
pause
