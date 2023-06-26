@echo off

call :InstallBuildTools
call :SetPath
call :InstallDacqMan

call :ExecuteCleanInstall

set /p choice=Enter Y to start DacqMan Software. Enter N to exit.
IF /I "%choice%"=="Y" (
    npm start
) ELSE (
    echo Exiting...
    timeout 2 >nul
    exit
)

rem Installs package manager chocolatey and uses that to install windows build tools in its own powershell
rem Check this shell to ensure build tools installed properly
:InstallBuildTools
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -InputFormat None -ExecutionPolicy Bypass -Command Start-Process '%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe' -ArgumentList '-NoProfile -InputFormat None -ExecutionPolicy Bypass -Command iex ((New-Object System.Net.WebClient).DownloadString(''https://chocolatey.org/install.ps1'')); choco upgrade -y python2 visualstudio2017-workload-vctools; Read-Host ''Type ENTER to continue'' ' -Verb RunAs
exit /b

rem Dacqman searches for this file in the wrong place so this updates the file path to the correct location.
rem May or may not affect other projects that use windows build tools on your system
:SetPath
powershell.exe -Command "$Env:VCTargetsPath = 'C:\Program Files (x86)\Microsoft Visual Studio\2017\BuildTools\Common7\IDE\VC\VCTargets'"
exit /b

:InstallDacqMan
powershell.exe -Command "echo $Env:VCTargetsPath"
exit /b

:ExecuteCleanInstall
npm install
exit /b