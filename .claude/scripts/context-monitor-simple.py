#!/usr/bin/env python3
"""
Claude Code Context Monitor - Simple ASCII Version
"""

import json
import sys
import os
import re

def main():
    try:
        # Read JSON input from Claude Code
        data = json.load(sys.stdin)
        
        # Extract basic info
        model_name = data.get('model', {}).get('display_name', 'Claude')
        workspace = data.get('workspace', {})
        transcript_path = data.get('transcript_path', '')
        
        # Get directory name
        project_dir = workspace.get('project_dir', '')
        directory = os.path.basename(project_dir) if project_dir else "unknown"
        
        # Try to parse context from transcript
        context_display = "[?] ???"
        if transcript_path and os.path.exists(transcript_path):
            try:
                with open(transcript_path, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                
                # Look for usage tokens in recent messages
                for line in reversed(lines[-10:]):
                    try:
                        msg = json.loads(line.strip())
                        if msg.get('type') == 'assistant':
                            usage = msg.get('message', {}).get('usage', {})
                            if usage:
                                input_tokens = usage.get('input_tokens', 0)
                                cache_read = usage.get('cache_read_input_tokens', 0)
                                total = input_tokens + cache_read
                                if total > 0:
                                    percent = min(100, (total / 200000) * 100)
                                    bars = int(percent / 10)
                                    bar = "#" * bars + "-" * (10 - bars)
                                    context_display = f"[OK]{bar} {percent:.0f}%"
                                    break
                    except:
                        continue
            except:
                pass
        
        # Simple output - ASCII only
        print(f"[{model_name}] [DIR] {directory} [CTX] {context_display}")
        
    except Exception as e:
        # Fallback
        directory = os.path.basename(os.getcwd())
        print(f"[Claude] [DIR] {directory} [CTX] [Error]")

if __name__ == "__main__":
    main()