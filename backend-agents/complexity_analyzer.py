import subprocess
import json
import os
from typing import Dict
from pydantic import BaseModel

class ComplexityAnalyzer:
    def __init__(self, repo_path: str):
        self.repo_path = repo_path

    def analyze(self) -> Dict[str, float]:
        """
        Calculates complexity scores for the repository.
        Returns a dict with average complexity per language.
        """
        scores = {
            "python": 0.0,
            "typescript": 0.0
        }
        
        # Python Complexity (Radon)
        try:
            # radon cc (Cyclomatic Complexity) - summary format
            result = subprocess.run(
                ["radon", "cc", "-s", "-a", self.repo_path],
                capture_output=True,
                text=True
            )
            if result.stdout:
                # Parse Radon output (very simplified for this demo)
                # Usually look for Average complexity: X.X
                for line in result.stdout.splitlines():
                    if "Average complexity:" in line:
                        scores["python"] = float(line.split(":")[1].strip().split()[0])
        except Exception:
            pass

        # TypeScript Complexity (ts-complexity)
        try:
            # npx ts-complexity --json
            result = subprocess.run(
                ["npx", "ts-complexity", "--json", self.repo_path],
                capture_output=True,
                text=True
            )
            if result.stdout:
                data = json.loads(result.stdout)
                # Example JSON: {"average": 5.2}
                scores["typescript"] = data.get("average", 0.0)
        except Exception:
            pass

        return scores
