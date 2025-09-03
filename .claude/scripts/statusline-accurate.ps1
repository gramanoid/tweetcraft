# Ultra-Accurate PowerShell statusline for Claude Code
# Precisely replicates the Python implementation logic

try {
    # Read JSON input from Claude Code
    $jsonInput = [Console]::In.ReadToEnd()
    $data = $jsonInput | ConvertFrom-Json
    
    # Extract basic information - EXACT match to Python
    $modelName = if ($data.model.display_name) { $data.model.display_name } else { "Claude" }
    
    # FIXED: Complete directory logic matching Python get_directory_display()
    $workspace = $data.workspace
    $currentDir = if ($workspace.current_dir) { $workspace.current_dir } else { "" }
    $projectDir = if ($workspace.project_dir) { $workspace.project_dir } else { "" }
    
    $directoryDisplay = "unknown"
    if ($currentDir -and $projectDir) {
        if ($currentDir.StartsWith($projectDir)) {
            $relPath = $currentDir.Substring($projectDir.Length).TrimStart('/', '\')
            $directoryDisplay = if ($relPath) { $relPath } else { Split-Path -Leaf $projectDir }
        } else {
            $directoryDisplay = Split-Path -Leaf $currentDir
        }
    } elseif ($projectDir) {
        $directoryDisplay = Split-Path -Leaf $projectDir
    } elseif ($currentDir) {
        $directoryDisplay = Split-Path -Leaf $currentDir
    }
    
    # Parse context usage from transcript - FIXED: Chronological order like Python
    $contextDisplay = "[?] ???"
    $transcriptPath = $data.transcript_path
    
    if ($transcriptPath -and (Test-Path $transcriptPath)) {
        try {
            # FIXED: Read all lines and process last 15 in REVERSE order (like Python)
            $allLines = Get-Content $transcriptPath
            $recentLines = if ($allLines.Count -gt 15) { $allLines[-15..-1] } else { $allLines }
            
            # FIXED: Process in reverse order like Python (most recent first)
            for ($i = $recentLines.Count - 1; $i -ge 0; $i--) {
                $line = $recentLines[$i]
                try {
                    $msg = $line | ConvertFrom-Json
                    
                    # Method 1: Parse usage tokens from assistant messages (EXACT match)
                    if ($msg.type -eq "assistant") {
                        $message = $msg.message
                        if ($message -and $message.usage) {
                            $usage = $message.usage
                            $inputTokens = if ($usage.input_tokens) { $usage.input_tokens } else { 0 }
                            $cacheRead = if ($usage.cache_read_input_tokens) { $usage.cache_read_input_tokens } else { 0 }
                            $cacheCreation = if ($usage.cache_creation_input_tokens) { $usage.cache_creation_input_tokens } else { 0 }
                            
                            $totalTokens = $inputTokens + $cacheRead + $cacheCreation
                            
                            if ($totalTokens -gt 0) {
                                # EXACT match: min(100, (total_tokens / 200000) * 100)
                                $percentUsed = [Math]::Min(100, ($totalTokens / 200000.0) * 100)
                                
                                # FIXED: 8 segments like Python (not 10)
                                $segments = 8
                                # FIXED: Use [int] truncation like Python, not Math.Floor
                                $filled = [int](($percentUsed / 100) * $segments)
                                $bar = "#" * $filled + "-" * ($segments - $filled)
                                
                                # FIXED: Status logic exactly matching Python thresholds
                                $status = if ($percentUsed -ge 95) { "[CRIT]" } 
                                         elseif ($percentUsed -ge 90) { "[HIGH]" }
                                         elseif ($percentUsed -ge 75) { "[WARN]" }
                                         elseif ($percentUsed -ge 50) { "[MED]" }
                                         else { "[OK]" }
                                
                                # FIXED: Round to 0 decimal places like Python {percent:.0f}
                                $contextDisplay = "$status$bar $([Math]::Round($percentUsed, 0))%"
                                break
                            }
                        }
                    }
                    
                    # Method 2: Parse system context warnings - EXACT regex match
                    elseif ($msg.type -eq "system_message") {
                        $content = if ($msg.content) { $msg.content } else { "" }
                        
                        # FIXED: Exact regex patterns from Python
                        if ($content -match "Context left until auto-compact: (\d+)%") {
                            $percentLeft = [int]$matches[1]
                            $percentUsed = 100 - $percentLeft
                            $segments = 8  # FIXED: 8 segments
                            $filled = [int](($percentUsed / 100) * $segments)
                            $bar = "#" * $filled + "-" * ($segments - $filled)
                            # FIXED: Exact alert text match
                            $contextDisplay = "[AUTO-COMPACT!]$bar $percentUsed%"
                            break
                        }
                        
                        if ($content -match "Context low \((\d+)% remaining\)") {
                            $percentLeft = [int]$matches[1]
                            $percentUsed = 100 - $percentLeft
                            $segments = 8  # FIXED: 8 segments  
                            $filled = [int](($percentUsed / 100) * $segments)
                            $bar = "#" * $filled + "-" * ($segments - $filled)
                            # FIXED: Exact alert text match
                            $contextDisplay = "[LOW!]$bar $percentUsed%"
                            break
                        }
                    }
                }
                catch {
                    # Skip invalid JSON lines (like Python)
                    continue
                }
            }
        }
        catch {
            # If transcript parsing fails, keep default
        }
    }
    
    # Parse session metrics - EXACT match to Python get_session_metrics()
    $sessionMetrics = ""
    if ($data.cost) {
        $metrics = @()
        
        # FIXED: Cost formatting exactly matching Python logic
        $costUsd = if ($data.cost.total_cost_usd) { [double]$data.cost.total_cost_usd } else { 0 }
        if ($costUsd -gt 0) {
            # EXACT Python logic: f"{cost_usd*100:.0f}¢" if cost_usd < 0.01 else f"${cost_usd:.3f}"
            if ($costUsd -lt 0.01) {
                $costStr = "$([Math]::Round($costUsd * 100, 0))c"  # Note: c not ¢ for compatibility
            } else {
                # FIXED: 3 decimal places like Python {cost_usd:.3f}
                $costStr = "`$$($costUsd.ToString("F3"))"
            }
            $metrics += "[$] $costStr"
        }
        
        # FIXED: Duration calculation exactly matching Python
        $durationMs = if ($data.cost.total_duration_ms) { [double]$data.cost.total_duration_ms } else { 0 }
        if ($durationMs -gt 0) {
            $minutes = $durationMs / 60000
            if ($minutes -lt 1) {
                # FIXED: Integer division like Python duration_ms//1000
                $durationStr = "$([Math]::Floor($durationMs / 1000))s"
            } else {
                # FIXED: Round to 0 decimals like Python {minutes:.0f}
                $durationStr = "$([Math]::Round($minutes, 0))m"
            }
            $metrics += "[T] $durationStr"
        }
        
        # Lines changed - EXACT match to Python logic
        $linesAdded = if ($data.cost.total_lines_added) { [int]$data.cost.total_lines_added } else { 0 }
        $linesRemoved = if ($data.cost.total_lines_removed) { [int]$data.cost.total_lines_removed } else { 0 }
        
        if ($linesAdded -gt 0 -or $linesRemoved -gt 0) {
            $netLines = $linesAdded - $linesRemoved
            # EXACT Python logic: "+" if net_lines >= 0 else ""
            $sign = if ($netLines -ge 0) { "+" } else { "" }
            $metrics += "[L] $sign$netLines"
        }
        
        # FIXED: Exact joining logic from Python
        if ($metrics.Count -gt 0) {
            $sessionMetrics = " | " + ($metrics -join " ")
        }
    }
    
    # FIXED: Output format exactly matching Python
    $statusLine = "[$modelName] [DIR] $directoryDisplay [CTX] $contextDisplay$sessionMetrics"
    Write-Host $statusLine -NoNewline
}
catch {
    # FIXED: Fallback matching Python error format
    $dirname = Split-Path -Leaf (Get-Location)
    Write-Host "[Claude] [DIR] $dirname [CTX] [Error]" -NoNewline
}