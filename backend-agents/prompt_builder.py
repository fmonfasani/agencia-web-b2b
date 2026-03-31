import json
from typing import List, Dict

class PromptBuilder:
    @staticmethod
    def build_audit_prompt(repo_url: str, architecture: dict, dependencies: List[dict], security_findings: List[dict], complexity_scores: Dict[str, float]) -> str:
        """
        Builds a comprehensive prompt for Claude to generate the audit summary.
        """
        prompt = f"""
        Act as a Principal Software Architect. Analyze the following audit data for the repository: {repo_url}
        
        ### Architecture Overview
        {json.dumps(architecture, indent=2)}
        
        ### Dependencies
        {json.dumps(dependencies[:20], indent=2)} (showing first 20)
        
        ### Security Findings (Semgrep)
        {json.dumps(security_findings, indent=2)}
        
        ### Complexity Metrics
        {json.dumps(complexity_scores, indent=2)}
        
        Your task is to generate a structured JSON report including:
        1. A high-level technical summary.
        2. Top 3 critical risks.
        3. Strategic recommendations for improvement.
        4. Scores (0-100) for: Architecture, Security, Code Quality, DevOps, Observability.
        
        Return ONLY valid JSON.
        """
        return prompt
