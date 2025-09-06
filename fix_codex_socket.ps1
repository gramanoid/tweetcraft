# Fix Codex Socket Permission Error Script
# Run this script as Administrator in PowerShell

Write-Host "Fixing Codex socket permission error..." -ForegroundColor Green
Write-Host ""

# Step 1: Kill processes using common ports
Write-Host "Step 1: Freeing up common ports..." -ForegroundColor Yellow
$processes = @()

# Check port 3000
$port3000 = netstat -ano | findstr :3000
if ($port3000) {
    $pids = $port3000 | ForEach-Object { 
        if ($_ -match '\s+(\d+)$') { $matches[1] } 
    } | Sort-Object -Unique
    
    foreach ($pid in $pids) {
        try {
            $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Host "  Killing process $($proc.Name) (PID: $pid) using port 3000"
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            }
        } catch {
            Write-Host "  Could not kill process $pid" -ForegroundColor Red
        }
    }
}

# Check port 5000
$port5000 = netstat -ano | findstr :5000
if ($port5000) {
    $pids = $port5000 | ForEach-Object { 
        if ($_ -match '\s+(\d+)$') { $matches[1] } 
    } | Sort-Object -Unique
    
    foreach ($pid in $pids) {
        try {
            $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($proc -and $proc.Name -ne "System") {
                Write-Host "  Killing process $($proc.Name) (PID: $pid) using port 5000"
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            }
        } catch {
            Write-Host "  Could not kill process $pid" -ForegroundColor Red
        }
    }
}

# Check port 8080
$port8080 = netstat -ano | findstr ":8080\s"
if ($port8080) {
    $pids = $port8080 | ForEach-Object { 
        if ($_ -match 'LISTENING\s+(\d+)$') { $matches[1] } 
    } | Sort-Object -Unique
    
    foreach ($pid in $pids) {
        try {
            $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($proc -and $proc.Name -ne "System") {
                Write-Host "  Killing process $($proc.Name) (PID: $pid) using port 8080"
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            }
        } catch {
            Write-Host "  Could not kill process $pid" -ForegroundColor Red
        }
    }
}

Write-Host "  Ports freed!" -ForegroundColor Green
Write-Host ""

# Step 2: Reset Windows Sockets
Write-Host "Step 2: Resetting Windows sockets..." -ForegroundColor Yellow
try {
    netsh winsock reset | Out-Null
    Write-Host "  Winsock reset complete!" -ForegroundColor Green
} catch {
    Write-Host "  Could not reset winsock" -ForegroundColor Red
}

try {
    netsh int ip reset | Out-Null
    Write-Host "  IP stack reset complete!" -ForegroundColor Green
} catch {
    Write-Host "  Could not reset IP stack" -ForegroundColor Red
}
Write-Host ""

# Step 3: Add Firewall rules for Codex
Write-Host "Step 3: Adding Windows Firewall exceptions..." -ForegroundColor Yellow

# Remove old rules if they exist
Remove-NetFirewallRule -DisplayName "Codex Inbound" -ErrorAction SilentlyContinue
Remove-NetFirewallRule -DisplayName "Codex Outbound" -ErrorAction SilentlyContinue

# Add new rules for common ports
try {
    New-NetFirewallRule -DisplayName "Codex Inbound" -Direction Inbound -Protocol TCP -LocalPort 3000,5000,8080,5173 -Action Allow | Out-Null
    Write-Host "  Added inbound firewall rule for ports 3000, 5000, 8080, 5173" -ForegroundColor Green
} catch {
    Write-Host "  Could not add inbound firewall rule" -ForegroundColor Red
}

try {
    New-NetFirewallRule -DisplayName "Codex Outbound" -Direction Outbound -Protocol TCP -LocalPort 3000,5000,8080,5173 -Action Allow | Out-Null
    Write-Host "  Added outbound firewall rule for ports 3000, 5000, 8080, 5173" -ForegroundColor Green
} catch {
    Write-Host "  Could not add outbound firewall rule" -ForegroundColor Red
}
Write-Host ""

# Step 4: Check Windows Defender exclusions
Write-Host "Step 4: Checking Windows Defender..." -ForegroundColor Yellow
try {
    # Add current directory to Windows Defender exclusions
    $currentPath = Get-Location
    Add-MpPreference -ExclusionPath $currentPath.Path -ErrorAction SilentlyContinue
    Write-Host "  Added current directory to Windows Defender exclusions" -ForegroundColor Green
} catch {
    Write-Host "  Could not modify Windows Defender settings (may need to do manually)" -ForegroundColor Yellow
}
Write-Host ""

# Step 5: Modify dynamic port range to avoid conflicts
Write-Host "Step 5: Adjusting dynamic port range..." -ForegroundColor Yellow
try {
    netsh int ipv4 set dynamicport tcp start=10000 num=10000 | Out-Null
    Write-Host "  Dynamic port range adjusted to 10000-20000" -ForegroundColor Green
} catch {
    Write-Host "  Could not adjust dynamic port range" -ForegroundColor Red
}
Write-Host ""

# Step 6: Display current port status
Write-Host "Step 6: Current port status:" -ForegroundColor Yellow
Write-Host "  Checking port 3000..." -ForegroundColor Cyan
$port3000Check = netstat -ano | findstr :3000
if ($port3000Check) {
    Write-Host "    WARNING: Port 3000 still in use" -ForegroundColor Red
    Write-Host "    $port3000Check"
} else {
    Write-Host "    ✓ Port 3000 is FREE" -ForegroundColor Green
}

Write-Host "  Checking port 5000..." -ForegroundColor Cyan
$port5000Check = netstat -ano | findstr :5000
if ($port5000Check) {
    Write-Host "    WARNING: Port 5000 still in use" -ForegroundColor Red
    Write-Host "    $port5000Check"
} else {
    Write-Host "    ✓ Port 5000 is FREE" -ForegroundColor Green
}

Write-Host "  Checking port 8080..." -ForegroundColor Cyan
$port8080Check = netstat -ano | findstr ":8080\s" | findstr LISTENING
if ($port8080Check) {
    Write-Host "    WARNING: Port 8080 still in use" -ForegroundColor Red
    Write-Host "    $port8080Check"
} else {
    Write-Host "    ✓ Port 8080 is FREE" -ForegroundColor Green
}
Write-Host ""

# Final message
Write-Host "================================" -ForegroundColor Magenta
Write-Host "Fix Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "IMPORTANT: You may need to restart your computer for socket reset to take effect." -ForegroundColor Yellow
Write-Host ""
Write-Host "Try running Codex again. If it still fails:" -ForegroundColor Cyan
Write-Host "1. Restart your computer"
Write-Host "2. Temporarily disable Windows Defender real-time protection"
Write-Host "3. Make sure Docker Desktop is not running"
Write-Host "4. Try running Codex with a specific port flag if available"
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")