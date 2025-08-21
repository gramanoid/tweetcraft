try { & taskkill /IM chrome.exe /F | Out-Null } catch {}
Write-Host "[WIN-CHROME] Killed all Chrome processes."