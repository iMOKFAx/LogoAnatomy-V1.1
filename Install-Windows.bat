@echo off
rem Logo Anatomy v1.0 installer for Windows - by Mohamed Mostafa
setlocal
set "DEST=%APPDATA%\Adobe\CEP\extensions\LogoAnatomy"
echo Installing Logo Anatomy...
for %%v in (11 12 13 14) do reg add "HKCU\Software\Adobe\CSXS.%%v" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul
if exist "%DEST%" rmdir /s /q "%DEST%"
mkdir "%DEST%"
xcopy "%~dp0LogoAnatomy" "%DEST%\" /E /I /Y >nul
echo.
echo Done. Restart Illustrator, then open:  Window  ^>  Extensions  ^>  Logo Anatomy
echo.
pause
