param(
  [switch]$Quiet
)

$ErrorActionPreference = "Stop"

function Have($id) { 
  try { 
    $result = winget list --id $id -e 2>$null
    return ($LASTEXITCODE -eq 0) 
  } catch { 
    return $false 
  } 
}

function Install($id) { 
  if (-not $Quiet) {
    Write-Host "[ENSURE-BROWSER] Installing $id via winget..."
  }
  winget install --id $id -e --accept-package-agreements --accept-source-agreements --silent --disable-interactivity
}

# Target browsers in priority order: Dev -> Canary -> Edge Dev -> Chromium
$targets = @(
  @{ id="Google.Chrome.Dev"; exe="Google\Chrome Dev\Application\chrome.exe" },
  @{ id="Google.Chrome.Canary"; exe="Google\Chrome SxS\Application\chrome.exe" },
  @{ id="Microsoft.Edge.Dev"; exe="Microsoft\Edge Dev\Application\msedge.exe" },
  @{ id="Chromium.Chromium"; exe="Chromium\Application\chrome.exe" }
)

$programFiles = @($Env:ProgramFiles, "${Env:ProgramFiles(x86)}", $Env:LocalAppData)

foreach($target in $targets) {
  # Check if already installed
  $installed = Have $target.id
  
  # If not installed, try to install it
  if (-not $installed) { 
    try { 
      Install $target.id
      Start-Sleep -Seconds 3  # Give installation time to complete
      $installed = Have $target.id
    } catch {
      if (-not $Quiet) {
        Write-Warning "[ENSURE-BROWSER] Failed to install $($target.id): $($_.Exception.Message)"
      }
    }
  }
  
  # If installed (either was already or just installed), find the executable
  if ($installed) {
    foreach($root in $programFiles) {
      $path = Join-Path $root $target.exe
      if (Test-Path $path) { 
        if (-not $Quiet) { 
          Write-Host "[ENSURE-BROWSER] Found: $($target.id) -> $path" 
        }
        Write-Output $path
        exit 0
      }
    }
    
    # Also check alternative common locations
    $altPaths = @(
      "C:\Users\$env:USERNAME\AppData\Local\$($target.exe)",
      "C:\Program Files\$($target.exe)",
      "C:\Program Files (x86)\$($target.exe)"
    )
    
    foreach($altPath in $altPaths) {
      if (Test-Path $altPath) {
        if (-not $Quiet) { 
          Write-Host "[ENSURE-BROWSER] Found: $($target.id) -> $altPath" 
        }
        Write-Output $altPath
        exit 0
      }
    }
  }
}

# Check if winget is available
try {
  winget --version 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) {
    Write-Error "[ENSURE-BROWSER] winget is not available. Please install App Installer from Microsoft Store or install Chrome Dev manually from https://www.google.com/chrome/dev/"
    exit 3
  }
} catch {
  Write-Error "[ENSURE-BROWSER] winget is not available. Please install App Installer from Microsoft Store or install Chrome Dev manually from https://www.google.com/chrome/dev/"
  exit 3
}

Write-Error "[ENSURE-BROWSER] No Dev-channel browser could be installed or found. Please install Chrome Dev manually from https://www.google.com/chrome/dev/"
exit 2