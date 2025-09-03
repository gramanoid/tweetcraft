# 100% Accurate PowerShell statusline for Claude Code
# Uses real Claude Code JSON structure and correct context windows

try {
    # Read JSON input from Claude Code
    $jsonInput = [Console]::In.ReadToEnd()
    $data = $jsonInput | ConvertFrom-Json
    
    # Extract information from REAL Claude Code JSON structure
    $modelName = if ($data.model.display_name) { $data.model.display_name } else { "Claude" }
    
    # Get directory from REAL workspace structure
    $currentDir = if ($data.workspace.current_dir) { $data.workspace.current_dir } else { "" }
    $projectDir = if ($data.workspace.project_dir) { $data.workspace.project_dir } else { "" }
    
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
    
    # CORRECT context window detection - Sonnet 4 has 200K by default
    $contextLimit = switch -Wildcard ($data.model.id.ToLower()) {
        "*sonnet-4*" { 200000 }     # Sonnet 4: 200K tokens (standard mode)
        "*opus-4.1*" { 200000 }     # Opus 4.1: 200K tokens  
        "*haiku*" { 200000 }        # Haiku: 200K tokens
        default { 200000 }          # Default fallback
    }
    
    # Parse context usage from transcript (most reliable method)
    $percentUsed = 0
    $transcriptPath = $data.transcript_path
    
    if ($transcriptPath -and (Test-Path $transcriptPath)) {
        try {
            $allLines = Get-Content $transcriptPath
            $recentLines = if ($allLines.Count -gt 15) { $allLines[-15..-1] } else { $allLines }
            
            # Process in reverse order (most recent first)
            for ($i = $recentLines.Count - 1; $i -ge 0; $i--) {
                $line = $recentLines[$i]
                try {
                    $msg = $line | ConvertFrom-Json
                    
                    # Look for assistant messages with usage data
                    if ($msg.type -eq "assistant" -and $msg.message -and $msg.message.usage) {
                        $usage = $msg.message.usage
                        $inputTokens = if ($usage.input_tokens) { $usage.input_tokens } else { 0 }
                        $cacheRead = if ($usage.cache_read_input_tokens) { $usage.cache_read_input_tokens } else { 0 }
                        $cacheCreation = if ($usage.cache_creation_input_tokens) { $usage.cache_creation_input_tokens } else { 0 }
                        
                        $totalTokens = $inputTokens + $cacheRead + $cacheCreation
                        $percentUsed = [Math]::Min(100, ($totalTokens / $contextLimit) * 100)
                        break
                    }
                    
                    # System context warnings
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
    
    # 12-segment progress bars - always shown
    $segments = 12
    $filled = [int](($percentUsed / 100) * $segments)
    $bar = "#" * $filled + "-" * ($segments - $filled)
    
    # Status indicators
    $status = if ($percentUsed -ge 95) { "[CRIT]" }
             elseif ($percentUsed -ge 90) { "[HIGH]" }
             elseif ($percentUsed -ge 75) { "[WARN]" }
             elseif ($percentUsed -ge 50) { "[MED]" }
             else { "[OK]" }
    
    $contextDisplay = "$status$bar $([Math]::Round($percentUsed, 0))%"
    
    # Session metrics from REAL Claude Code JSON structure
    $sessionMetrics = ""
    if ($data.cost) {
        $metrics = @()
        
        # Cost (exact from Claude Code)
        $costUsd = if ($data.cost.total_cost_usd) { [double]$data.cost.total_cost_usd } else { 0 }
        if ($costUsd -gt 0) {
            $costWarning = ""
            if ($costUsd -gt 5.0) { $costWarning = "!!" }
            elseif ($costUsd -gt 2.0) { $costWarning = "!" }
            elseif ($costUsd -gt 1.0) { $costWarning = "~" }
            
            if ($costUsd -lt 0.01) {
                $costStr = "$([Math]::Round($costUsd * 100, 0))c"
            } else {
                $costStr = "`$$($costUsd.ToString('F2'))"
            }
            $metrics += "[$] $costStr$costWarning"
        }
        
        # Duration (exact from Claude Code)
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
            
            $timeWarning = ""
            if ($hours -ge 2) { $timeWarning = "LONG" }
            elseif ($minutes -ge 30) { $timeWarning = "+" }
            
            $metrics += "[T] $durationStr$timeWarning"
        }
        
        # Lines changed (exact from Claude Code)
        $linesAdded = if ($data.cost.total_lines_added) { [int]$data.cost.total_lines_added } else { 0 }
        $linesRemoved = if ($data.cost.total_lines_removed) { [int]$data.cost.total_lines_removed } else { 0 }
        
        if ($linesAdded -gt 0 -or $linesRemoved -gt 0) {
            $netLines = $linesAdded - $linesRemoved
            $sign = if ($netLines -ge 0) { "+" } else { "" }
            
            $prodIndicator = ""
            if ($netLines -gt 500) { $prodIndicator = "HIGH" }
            elseif ($netLines -gt 100) { $prodIndicator = "+" }
            elseif ($netLines -lt -100) { $prodIndicator = "CLEAN" }
            
            $metrics += "[L] $sign$netLines$prodIndicator"
        }
        
        if ($metrics.Count -gt 0) {
            $sessionMetrics = " | " + ($metrics -join " ")
        }
    }
    
    # Final display - always use full format
    $statusLine = "[$modelName] [$directoryDisplay] CTX:$contextDisplay$sessionMetrics"
    Write-Host $statusLine -NoNewline
}
catch {
    # Fallback
    $dirname = Split-Path -Leaf (Get-Location)
    $timestamp = Get-Date -Format "HH:mm"
    Write-Host "[Claude] [$dirname] [Error@$timestamp]" -NoNewline
}