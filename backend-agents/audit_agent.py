import os
import json
import httpx
from typing import Optional
from auditor.ai.prompt_builder import PromptBuilder

class AuditAgent:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        self.model = os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20240620")

    async def generate_summary(self, audit_data: dict) -> dict:
        """
        Sends audit data to Claude and returns the structured summary.
        """
        if not self.api_key:
            # Fallback for demo if no key is provided
            return {
                "summary": "Audit data collected. AI Summary pending API key configuration.",
                "risks": ["API Key Missing"],
                "recommendations": ["Configure ANTHROPIC_API_KEY"],
                "scores": {"architecture": 50, "security": 50, "code_quality": 50, "devops": 50, "observability": 50}
            }

        prompt = PromptBuilder.build_audit_prompt(
            repo_url=audit_data["repo_url"],
            architecture=audit_data["architecture"],
            dependencies=audit_data["dependencies"],
            security_findings=audit_data["security_findings"],
            complexity_scores=audit_data["complexity_scores"]
        )

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": self.api_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json"
                    },
                    json={
                        "model": self.model,
                        "max_tokens": 2048,
                        "messages": [{"role": "user", "content": prompt}],
                        "system": "You are a world-class software auditor. Respond only in valid JSON."
                    }
                )
                response.raise_for_status()
                result = response.json()
                content = result["content"][0]["text"]
                return json.loads(content)
        except Exception as e:
            return {"error": str(e), "summary": "Failed to generate AI summary."}
