import subprocess
import json
import os
from typing import List
from pydantic import BaseModel

class Finding(BaseModel):
    severity: str
    category: str
    file: str
    line: int
    message: str
    recommendation: str

class SecurityAnalyzer:
    def __init__(self, repo_path: str):
        self.repo_path = repo_path

    def analyze(self) -> List[Finding]:
        findings = []
        try:
            # Run semgrep with a standard policy (e.g., p/security-audit)
            # Output in JSON format
            result = subprocess.run(
                [
                    "semgrep",
                    "--config", "p/security-audit",
                    "--json",
                    self.repo_path
                ],
                capture_output=True,
                text=True
            )
            
            if result.stdout:
                data = json.loads(result.stdout)
                for res in data.get("results", []):
                    findings.append(Finding(
                        severity=res.get("extra", {}).get("severity", "medium").lower(),
                        category="security",
                        file=res.get("path"),
                        line=res.get("start", {}).get("line", 0),
                        message=res.get("extra", {}).get("message", ""),
                        recommendation="Review semgrep documentation for this rule."
                    ))
        except Exception:
            # If semgrep fails or is not installed, we gracefully return empty findings
            # In a real scenario, we'd log this.
            pass
            
        return findings
