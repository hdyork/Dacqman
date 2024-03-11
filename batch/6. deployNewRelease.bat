@echo off
cd /D "%~dp0"
cd ..

echo.
set /P runExtraCommand="Deploy new release to github repo? (y/n): "
if /I "%runExtraCommand%" EQU "y" (
    echo Running deploy-packed-win...
    npm run deploy-packed-win
) else (
    echo Exiting...
    pause
    exit
)

echo.
pause
exit