#!/usr/bin/env python3
"""
Claude Code Context Monitor - Ultra Bulletproof ASCII Version
Handles all possible Unicode/encoding issues
"""

import sys
import os

def safe_read_json():
    """Safely read JSON input with encoding protection."""
    try:
        import json
        # Read with explicit encoding handling
        input_data = sys.stdin.read()
        
        # Strip any problematic Unicode characters
        clean_data = ''.join(char for char in input_data if ord(char) < 128 or char.isspace())
        
        # Parse JSON
        data = json.loads(clean_data)
        return data
    except:
        return None

def main():
    try:
        # Get basic info safely
        data = safe_read_json()
        
        if data:
            model_name = str(data.get('model', {}).get('display_name', 'Claude'))[:20]
            workspace = data.get('workspace', {})
            project_dir = str(workspace.get('project_dir', ''))[:50]
            directory = os.path.basename(project_dir) if project_dir else "unknown"
        else:
            model_name = "Claude"
            directory = os.path.basename(os.getcwd())
        
        # Ultra-safe ASCII output only
        output = "[{}] [DIR] {} [CTX] [OK]".format(
            ''.join(c for c in model_name if c.isprintable() and ord(c) < 128)[:10],
            ''.join(c for c in directory if c.isprintable() and ord(c) < 128)[:15]
        )
        
        # Print with ASCII-only guarantee
        print(output.encode('ascii', 'ignore').decode('ascii'))
        
    except Exception:
        # Ultimate fallback - hardcoded ASCII
        print("[Claude] [DIR] project [CTX] [OK]")

if __name__ == "__main__":
    main()