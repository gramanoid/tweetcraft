@echo off
:: This batch file runs the Codex fix script as Administrator

echo ===================================
echo Codex Socket Permission Error Fixer
echo ===================================
echo.
echo This will run a PowerShell script to fix the Codex socket error.
echo You will be prompted for Administrator privileges.
echo.
pause

:: Run PowerShell script as Administrator
powershell -Command "Start-Process PowerShell -ArgumentList '-ExecutionPolicy Bypass -File ""%~dp0fix_codex_socket.ps1""' -Verb RunAs"

echo.
echo Script launched in Administrator PowerShell window.
echo Follow the instructions in that window.
echo.
pause