@echo off
cd /D "%~dp0"
cd ..

echo.
echo Adding changes to the staging area...
git add .

echo.
set /P commitMessage="Enter a commit message: "
git commit -m "%commitMessage%"

echo.
echo Pushing changes to checkout branch...
git push -u origin HEAD

echo.
pause
exit