@echo off
cd /d "%~dp0"
py -3 design_factory.py review --root "%~dp0..\.."
echo.
echo Designs ueber Entwurfs-ID freigeben oder ablehnen. Details: README-DE.md
pause
