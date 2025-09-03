# Full-featured PowerShell statusline for Claude Code
# Replicates all the original Python features without encoding issues

try {
    # Read JSON input from Claude Code
    $jsonInput = [Console]::In.ReadToEnd()
    $data = $jsonInput | ConvertFrom-Json
    
    # Extract basic information
    $modelName = if ($data.model.display_name) { $data.model.display_name } else { "Claude" }
    $projectDir = if ($data.workspace.project_dir) { Split-Path -Leaf $data.workspace.project_dir } else { "unknown" }
    
    # Parse context usage from transcript
    $contextDisplay = "[?] ???"
    $transcriptPath = $data.transcript_path
    
    if ($transcriptPath -and (Test-Path $transcriptPath)) {
        try {
            # Read last 15 lines of transcript
            $lines = Get-Content $transcriptPath -Tail 15
            
            foreach ($line in ($lines | Sort-Object {$_.Length} -Descending)) {
                try {
                    $msg = $line | ConvertFrom-Json
                    
                    # Look for assistant messages with usage data
                    if ($msg.type -eq "assistant" -and $msg.message.usage) {
                        $usage = $msg.message.usage
                        $inputTokens = if ($usage.input_tokens) { $usage.input_tokens } else { 0 }
                        $cacheRead = if ($usage.cache_read_input_tokens) { $usage.cache_read_input_tokens } else { 0 }
                        $cacheCreation = if ($usage.cache_creation_input_tokens) { $usage.cache_creation_input_tokens } else { 0 }
                        
                        $totalTokens = $inputTokens + $cacheRead + $cacheCreation
                        
                        if ($totalTokens -gt 0) {
                            $percentUsed = [Math]::Min(100, ($totalTokens / 200000) * 100)
                            
                            # Create progress bar
                            $segments = 10
                            $filled = [Math]::Floor(($percentUsed / 100) * $segments)
                            $bar = "#" * $filled + "-" * ($segments - $filled)
                            
                            # Status based on usage
                            $status = if ($percentUsed -ge 95) { "[CRIT]" } 
                                     elseif ($percentUsed -ge 90) { "[HIGH]" }
                                     elseif ($percentUsed -ge 75) { "[WARN]" }
                                     elseif ($percentUsed -ge 50) { "[MED]" }
                                     else { "[OK]" }
                            
                            $contextDisplay = "$status$bar $([Math]::Round($percentUsed, 0))%"
                            break
                        }
                    }
                    
                    # Look for system context warnings
                    if ($msg.type -eq "system_message") {
                        if ($msg.content -match "Context left until auto-compact: (\d+)%") {
                            $percentLeft = [int]$matches[1]
                            $percentUsed = 100 - $percentLeft
                            $segments = 10
                            $filled = [Math]::Floor(($percentUsed / 100) * $segments)
                            $bar = "#" * $filled + "-" * ($segments - $filled)
                            $contextDisplay = "[AUTO-COMPACT]$bar $percentUsed%"
                            break
                        }
                        
                        if ($msg.content -match "Context low \((\d+)% remaining\)") {
                            $percentLeft = [int]$matches[1]
                            $percentUsed = 100 - $percentLeft
                            $segments = 10
                            $filled = [Math]::Floor(($percentUsed / 100) * $segments)
                            $bar = "#" * $filled + "-" * ($segments - $filled)
                            $contextDisplay = "[LOW]$bar $percentUsed%"
                            break
                        }
                    }
                }
                catch {
                    # Skip invalid JSON lines
                    continue
                }
            }
        }
        catch {
            # If transcript parsing fails, keep default
        }
    }
    
    # Parse session metrics
    $sessionMetrics = ""
    if ($data.cost) {
        $metrics = @()
        
        # Cost
        if ($data.cost.total_cost_usd -and $data.cost.total_cost_usd -gt 0) {
            $costUsd = [double]$data.cost.total_cost_usd
            if ($costUsd -lt 0.01) {
                $costStr = "$([Math]::Round($costUsd * 100, 0))c"
            } else {
                $costStr = "`$$([Math]::Round($costUsd, 3))"
            }
            $metrics += "[$] $costStr"
        }
        
        # Duration
        if ($data.cost.total_duration_ms -and $data.cost.total_duration_ms -gt 0) {
            $durationMs = [double]$data.cost.total_duration_ms
            $minutes = $durationMs / 60000
            if ($minutes -lt 1) {
                $durationStr = "$([Math]::Floor($durationMs / 1000))s"
            } else {
                $durationStr = "$([Math]::Round($minutes, 0))m"
            }
            $metrics += "[T] $durationStr"
        }
        
        # Lines changed
        $linesAdded = if ($data.cost.total_lines_added) { $data.cost.total_lines_added } else { 0 }
        $linesRemoved = if ($data.cost.total_lines_removed) { $data.cost.total_lines_removed } else { 0 }
        
        if ($linesAdded -gt 0 -or $linesRemoved -gt 0) {
            $netLines = $linesAdded - $linesRemoved
            $sign = if ($netLines -ge 0) { "+" } else { "" }
            $metrics += "[L] $sign$netLines"
        }
        
        if ($metrics.Count -gt 0) {
            $sessionMetrics = " | " + ($metrics -join " ")
        }
    }
    
    # Output the full statusline
    $statusLine = "[$modelName] [DIR] $projectDir [CTX] $contextDisplay$sessionMetrics"
    Write-Host $statusLine -NoNewline
}
catch {
    # Fallback on any error
    $dirname = Split-Path -Leaf (Get-Location)
    Write-Host "[Claude] [DIR] $dirname [CTX] [Error]" -NoNewline
}