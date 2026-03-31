import os
import json
from typing import List, Dict
from pydantic import BaseModel

class Dependency(BaseModel):
    name: str
    version: str
    type: str  # "npm", "pip", "unknown"

class DependencyScanner:
    def __init__(self, repo_path: str):
        self.repo_path = repo_path

    def scan(self) -> List[Dependency]:
        dependencies = []
        
        # Scan for package.json
        npm_deps = self._scan_npm()
        dependencies.extend(npm_deps)
        
        # Scan for requirements.txt
        pip_deps = self._scan_pip()
        dependencies.extend(pip_deps)
        
        return dependencies

    def _scan_npm(self) -> List[Dependency]:
        deps = []
        pkg_json_path = os.path.join(self.repo_path, "package.json")
        if os.path.exists(pkg_json_path):
            try:
                with open(pkg_json_path, "r") as f:
                    data = json.load(f)
                    all_deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
                    for name, version in all_deps.items():
                        deps.append(Dependency(name=name, version=str(version), type="npm"))
            except Exception:
                pass
        return deps

    def _scan_pip(self) -> List[Dependency]:
        deps = []
        req_txt_path = os.path.join(self.repo_path, "requirements.txt")
        if os.path.exists(req_txt_path):
            try:
                with open(req_txt_path, "r") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#"):
                            # Simple parsing for "name==version"
                            if "==" in line:
                                name, version = line.split("==", 1)
                                deps.append(Dependency(name=name, version=version, type="pip"))
                            elif ">=" in line:
                                name, version = line.split(">=", 1)
                                deps.append(Dependency(name=name, version=version, type="pip"))
                            else:
                                deps.append(Dependency(name=line, version="latest", type="pip"))
            except Exception:
                pass
        return deps
