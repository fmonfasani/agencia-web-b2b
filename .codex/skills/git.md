# Skill: git

## Purpose

Allows the agent to inspect commit history, diffs, and detect regressions in the Webshooks repository.

## Repository Info

```
Repo root: c:\Users\fmonf\Desktop\Software Enginnering LAPTOP\Webshooks\agencia-web-b2b\
VCS:       Git
```

## Common Commands (PowerShell)

### Recent history

```powershell
cd "c:\Users\fmonf\Desktop\Software Enginnering LAPTOP\Webshooks\agencia-web-b2b"
git log --oneline -20
```

### Show last commit details

```powershell
git show --stat HEAD
```

### Diff of uncommitted changes

```powershell
git diff
git diff --staged
```

### Diff between two commits

```powershell
git diff <commit-a> <commit-b> -- <optional-file>
```

### Who changed a specific line

```powershell
git blame prisma/schema.prisma
```

### Find when a bug was introduced

```powershell
git log --all --oneline -- src/lib/auth.ts
```

### Check branch status

```powershell
git status
git branch -a
```

## Regression Detection Workflow

1. Run `git log --oneline -20` to see recent commits
2. If behavior changed (e.g., auth broken), run `git diff <old-commit> HEAD -- <file>`
3. Use `git blame` to identify authorship of problematic changes.
4. Use `git stash` to isolate working state if needed for comparison.

## Usage Instructions

Use the MCP `git` server or run commands via the `run_command` tool.
Always check git log before reporting a bug — it may already be documented or part of a recent refactor.
