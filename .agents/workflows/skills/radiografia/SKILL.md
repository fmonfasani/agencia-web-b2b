---
name: Project Radiography (Radiografía)
description: Performs a comprehensive project audit, including directory structure, dependencies, Git history, hotspots, and environment variables keys.
---

# Project Radiography Skill

This skill allows Antigravity to quickly understand the current state of a project.

## Capabilities
- **Structure Analysis**: Lists files and folders (up to depth 3).
- **Dependency Audit**: Inspects `package.json`.
- **Git Insights**: Retrieves recent commit history and identifies "hotspot" files that change frequently.
- **Environment Check**: Lists defined environment variable keys.

## Usage
Run the `run.ps1` script to generate a report in `.agents/skills/radiografia/output.json`.

```powershell
./run.ps1
```
