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
echo Pushing changes to the master branch...
git push -u origin master

echo.
set /P runExtraCommand="Deploy changes to github repo? (y/n): "
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