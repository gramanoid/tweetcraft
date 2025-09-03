# Enhanced Ultra-Accurate PowerShell statusline for Claude Code
# Real-time token counting + Enhanced visuals + Smart adaptive display

try {
    # Read JSON input from Claude Code
    $jsonInput = [Console]::In.ReadToEnd()
    $data = $jsonInput | ConvertFrom-Json
    
    # Extract basic information
    $modelName = if ($data.model.display_name) { $data.model.display_name } else { "Claude" }
    # Compact model name for better space usage
    $compactModel = $modelName -replace "Claude ", "" -replace "Sonnet", "S" -replace "Haiku", "H" -replace "Opus", "O"
    
    # Enhanced directory logic with better display
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
    
    # ENHANCED: Dynamic context window detection
    $contextLimit = switch -Wildcard ($modelName.ToLower()) {
        "*sonnet*" { 200000 }
        "*haiku*" { 200000 }  
        "*opus*" { 200000 }
        "*gpt-4*" { 128000 }
        "*gpt-3*" { 16000 }
        default { 200000 }
    }
    
    # ENHANCED: Real-time token counting with hybrid fallback
    $percentUsed = 0
    $totalTokens = 0
    $contextDisplay = "[?] ???"
    $foundRealTime = $false
    
    # Method 1: Real-time from JSON input (most accurate)
    if ($data.usage -and $data.usage.input_tokens) {
        $inputTokens = $data.usage.input_tokens
        $cacheRead = if ($data.usage.cache_read_input_tokens) { $data.usage.cache_read_input_tokens } else { 0 }
        $cacheCreation = if ($data.usage.cache_creation_input_tokens) { $data.usage.cache_creation_input_tokens } else { 0 }
        
        $totalTokens = $inputTokens + $cacheRead + $cacheCreation
        $percentUsed = [Math]::Min(100, ($totalTokens / $contextLimit) * 100)
        $foundRealTime = $true
    }
    # Method 2: Check for current conversation tokens in data
    elseif ($data.conversation -and $data.conversation.total_tokens) {
        $totalTokens = $data.conversation.total_tokens
        $percentUsed = [Math]::Min(100, ($totalTokens / $contextLimit) * 100)
        $foundRealTime = $true
    }
    
    # Method 3: Fallback to transcript parsing (original method)
    if (-not $foundRealTime) {
        $transcriptPath = $data.transcript_path
        
        if ($transcriptPath -and (Test-Path $transcriptPath)) {
            try {
                $allLines = Get-Content $transcriptPath
                $recentLines = if ($allLines.Count -gt 15) { $allLines[-15..-1] } else { $allLines }
                
                for ($i = $recentLines.Count - 1; $i -ge 0; $i--) {
                    $line = $recentLines[$i]
                    try {
                        $msg = $line | ConvertFrom-Json
                        
                        if ($msg.type -eq "assistant" -and $msg.message -and $msg.message.usage) {
                            $usage = $msg.message.usage
                            $inputTokens = if ($usage.input_tokens) { $usage.input_tokens } else { 0 }
                            $cacheRead = if ($usage.cache_read_input_tokens) { $usage.cache_read_input_tokens } else { 0 }
                            $cacheCreation = if ($usage.cache_creation_input_tokens) { $usage.cache_creation_input_tokens } else { 0 }
                            
                            $totalTokens = $inputTokens + $cacheRead + $cacheCreation
                            $percentUsed = [Math]::Min(100, ($totalTokens / $contextLimit) * 100)
                            break
                        }
                        
                        # System warnings
                        elseif ($msg.type -eq "system_message") {
                            $content = if ($msg.content) { $msg.content } else { "" }
                            
                            if ($content -match "Context left until auto-compact: (\d+)%") {
                                $percentLeft = [int]$matches[1]
                                $percentUsed = 100 - $percentLeft
                                break
                            }
                            
                            if ($content -match "Context low \((\d+)% remaining\)") {
                                $percentLeft = [int]$matches[1]
                                $percentUsed = 100 - $percentLeft
                                break
                            }
                        }
                    }
                    catch { continue }
                }
            }
            catch { }
        }
    }
    
    # ENHANCED: 12-segment progress bars with better visual fidelity
    if ($percentUsed -gt 0) {
        $segments = 12
        $filled = [int](($percentUsed / 100) * $segments)
        $bar = "#" * $filled + "-" * ($segments - $filled)
        
        # ENHANCED: Smart status indicators with emojis (fallback to ASCII)
        $status = if ($percentUsed -ge 95) { "[CRIT]" }  # Critical
                 elseif ($percentUsed -ge 90) { "[HIGH]" }  # High usage
                 elseif ($percentUsed -ge 75) { "[WARN]" }  # Warning
                 elseif ($percentUsed -ge 50) { "[MED]" }   # Medium
                 else { "[OK]" }                            # OK
        
        # Add trend indication if we have session data
        $trendArrow = ""
        if ($data.cost -and $data.cost.total_duration_ms -and $data.cost.total_duration_ms -gt 300000) { # 5+ min session
            # Simple trend based on usage level vs session time
            $avgUsageRate = $percentUsed / ($data.cost.total_duration_ms / 60000) # per minute
            if ($avgUsageRate -gt 8) { $trendArrow = "↗" }      # Fast growth
            elseif ($avgUsageRate -lt 3) { $trendArrow = "→" }  # Stable  
            else { $trendArrow = "↗" }                          # Normal growth
        }
        
        $contextDisplay = "$status$bar $([Math]::Round($percentUsed, 0))%$trendArrow"
    }
    
    # ENHANCED: Session metrics with smart formatting and warnings
    $sessionMetrics = ""
    if ($data.cost) {
        $metrics = @()
        
        # Cost with smart color indicators
        $costUsd = if ($data.cost.total_cost_usd) { [double]$data.cost.total_cost_usd } else { 0 }
        if ($costUsd -gt 0) {
            $costWarning = ""
            if ($costUsd -gt 5.0) { $costWarning = "🚨" }      # Very expensive
            elseif ($costUsd -gt 2.0) { $costWarning = "⚠️" }    # Expensive  
            elseif ($costUsd -gt 1.0) { $costWarning = "💡" }    # Moderate
            
            if ($costUsd -lt 0.01) {
                $costStr = "$([Math]::Round($costUsd * 100, 0))c"
            } else {
                $costStr = "`$$($costUsd.ToString("F2"))"  # 2 decimal places for readability
            }
            $metrics += "[$] $costStr$costWarning"
        }
        
        # Duration with session length awareness
        $durationMs = if ($data.cost.total_duration_ms) { [double]$data.cost.total_duration_ms } else { 0 }
        if ($durationMs -gt 0) {
            $minutes = $durationMs / 60000
            $hours = $minutes / 60
            
            $durationStr = if ($hours -ge 1) {
                "$([Math]::Floor($hours))h$([Math]::Round($minutes % 60, 0))m"
            } elseif ($minutes -ge 1) {
                "$([Math]::Round($minutes, 0))m"
            } else {
                "$([Math]::Floor($durationMs / 1000))s"
            }
            
            # Add session length warning
            $timeWarning = ""
            if ($hours -ge 2) { $timeWarning = "⏰" }     # Very long session
            elseif ($minutes -ge 30) { $timeWarning = "⏱️" }  # Long session
            
            $metrics += "[T] $durationStr$timeWarning"
        }
        
        # Lines changed with productivity indicator
        $linesAdded = if ($data.cost.total_lines_added) { [int]$data.cost.total_lines_added } else { 0 }
        $linesRemoved = if ($data.cost.total_lines_removed) { [int]$data.cost.total_lines_removed } else { 0 }
        
        if ($linesAdded -gt 0 -or $linesRemoved -gt 0) {
            $netLines = $linesAdded - $linesRemoved
            $sign = if ($netLines -ge 0) { "+" } else { "" }
            
            # Productivity indicators
            $prodIndicator = ""
            if ($netLines -gt 500) { $prodIndicator = "🚀" }      # High productivity
            elseif ($netLines -gt 100) { $prodIndicator = "📈" }   # Good productivity
            elseif ($netLines -lt -100) { $prodIndicator = "🧹" }  # Major cleanup
            
            $metrics += "[L] $sign$netLines$prodIndicator"
        }
        
        if ($metrics.Count -gt 0) {
            $sessionMetrics = " | " + ($metrics -join " ")
        }
    }
    
    # ENHANCED: Adaptive display based on context usage and available space
    $adaptiveDisplay = ""
    
    if ($percentUsed -ge 75) {
        # High usage: Detailed mode with warnings
        $adaptiveDisplay = "[$compactModel] [$directoryDisplay] CTX:$contextDisplay$sessionMetrics"
        
        # Add compaction warning
        if ($percentUsed -ge 90) {
            $adaptiveDisplay += " [COMPACT SOON]"
        }
    } elseif ($percentUsed -ge 50) {
        # Medium usage: Standard mode
        $adaptiveDisplay = "[$compactModel] [$directoryDisplay] CTX:$contextDisplay$sessionMetrics"
    } else {
        # Low usage: Compact mode
        if ($sessionMetrics) {
            $adaptiveDisplay = "[$compactModel] [$directoryDisplay] [$status:$([Math]::Round($percentUsed, 0))%]$sessionMetrics"
        } else {
            $adaptiveDisplay = "[$compactModel] [$directoryDisplay] CTX:$contextDisplay"
        }
    }
    
    Write-Host $adaptiveDisplay -NoNewline
}
catch {
    # Enhanced fallback with more info
    $dirname = Split-Path -Leaf (Get-Location)
    $timestamp = Get-Date -Format "HH:mm"
    Write-Host "[Claude] [$dirname] [Error@$timestamp]" -NoNewline
}