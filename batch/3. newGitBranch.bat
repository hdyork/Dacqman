@echo off
cd /D "%~dp0"
cd ..

echo.
set /P branchName="Enter a new branch name: "
git checkout -b "%branchName%"

echo.
echo Switched to a new branch: "%branchName%"
pause
exit