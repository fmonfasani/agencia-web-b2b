import os
import shutil
import tempfile
import subprocess
from typing import Optional
from pydantic import BaseModel

class ScannerResult(BaseModel):
    temp_dir: str
    file_count: int
    languages: list[str]

class RepoScanner:
    def __init__(self, repo_url: str, github_token: Optional[str] = None):
        self.repo_url = repo_url
        self.github_token = github_token
        self.temp_dir: Optional[str] = None

    def clone(self) -> str:
        """
        Clones the repository to a temporary directory.
        Returns the path to the temporary directory.
        """
        self.temp_dir = tempfile.mkdtemp(prefix="audit_")
        
        # Build clone URL with token if provided
        clone_url = self.repo_url
        if self.github_token:
            if "https://" in clone_url:
                clone_url = clone_url.replace("https://", f"https://{self.github_token}@")
        
        try:
            subprocess.run(
                ["git", "clone", "--depth", "1", clone_url, self.temp_dir],
                check=True,
                capture_output=True,
                text=True
            )
            return self.temp_dir
        except subprocess.CalledProcessError as e:
            self.cleanup()
            raise Exception(f"Failed to clone repository: {e.stderr}")

    def get_summary(self) -> ScannerResult:
        """
        Walks through the cloned repo and builds a basic summary.
        """
        if not self.temp_dir:
            raise Exception("Repository not cloned yet.")

        file_count = 0
        extensions = set()
        
        for root, dirs, files in os.walk(self.temp_dir):
            if ".git" in dirs:
                dirs.remove(".git")
            
            file_count += len(files)
            for f in files:
                ext = os.path.splitext(f)[1]
                if ext:
                    extensions.add(ext.lower())

        return ScannerResult(
            temp_dir=self.temp_dir,
            file_count=file_count,
            languages=list(extensions)
        )

    def cleanup(self):
        """
        Removes the temporary directory.
        """
        if self.temp_dir and os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)
