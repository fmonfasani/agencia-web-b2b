import os
from typing import List
from pydantic import BaseModel

class ArchitectureScanner:
    def __init__(self, repo_path: str):
        self.repo_path = repo_path

    def scan(self) -> dict:
        """
        Analyzes the directory structure to identify patterns.
        """
        structure = {
            "has_src": os.path.isdir(os.path.join(self.repo_path, "src")),
            "has_api": os.path.isdir(os.path.join(self.repo_path, "api")),
            "has_tests": any(os.path.isdir(os.path.join(self.repo_path, d)) for d in ["tests", "test", "__tests__"]),
            "has_docker": os.path.exists(os.path.join(self.repo_path, "Dockerfile")),
            "has_prisma": os.path.isdir(os.path.join(self.repo_path, "prisma")),
            "frameworks": self._detect_frameworks()
        }
        return structure

    def _detect_frameworks(self) -> List[str]:
        frameworks = []
        # Next.js
        if os.path.exists(os.path.join(self.repo_path, "next.config.js")) or \
           os.path.exists(os.path.join(self.repo_path, "next.config.ts")):
            frameworks.append("Next.js")
        
        # FastAPI
        if os.path.exists(os.path.join(self.repo_path, "main.py")):
            with open(os.path.join(self.repo_path, "main.py"), "r") as f:
                content = f.read()
                if "FastAPI" in content:
                    frameworks.append("FastAPI")
        
        return frameworks
