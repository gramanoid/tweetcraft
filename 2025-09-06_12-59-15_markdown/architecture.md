---
Generated with [Shotgun](https://shotgun.sh) - Agentic Development Environment
Session: session-7ba52a3d-4dcb-4e09-8034-76028e968dcc
Date: 2025-09-06 08:59:39 UTC
---
# Architecture Overview

- Extension architecture diagram
- Data flow overview
- Key components and their interactions

## Modules
- Background script
- Popup UI
- Content script
- Messaging bridge

## Data Flow
1. User action triggers extension event
2. Event is sent to background
3. Background communicates with APIs and content
4. Results render in UI

## Development Notes
- Use webpack for bundling
- Follow TS best practices
