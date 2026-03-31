import asyncio
from typing import List, Optional
from auditor.scanners.repo_scanner import RepoScanner
from auditor.scanners.dependency_scanner import DependencyScanner
from auditor.scanners.architecture_scanner import ArchitectureScanner
from auditor.analyzers.security_analyzer import SecurityAnalyzer
from auditor.analyzers.complexity_analyzer import ComplexityAnalyzer
from auditor.ai.audit_agent import AuditAgent
from auditor.database import AuditorDB

class ReportGenerator:
    def __init__(self, db_url: Optional[str] = None, anthropic_key: Optional[str] = None):
        self.db = AuditorDB(db_url)
        self.ai = AuditAgent(anthropic_key)

    async def run_audit(self, repo_url: str):
        # 1. Create audit record
        audit_id = self.db.create_audit(repo_url)
        
        scanner = RepoScanner(repo_url)
        try:
            # 2. Clone Repository
            temp_path = scanner.clone()
            
            # 3. Parallel Scans & Analysis
            dep_scanner = DependencyScanner(temp_path)
            arch_scanner = ArchitectureScanner(temp_path)
            sec_analyzer = SecurityAnalyzer(temp_path)
            comp_analyzer = ComplexityAnalyzer(temp_path)
            
            # Run blocking tasks in thread pool if needed, but here we just call them
            # (Assuming they are fast enough for initial implementation)
            architecture = arch_scanner.scan()
            dependencies = dep_scanner.scan()
            security_findings = sec_analyzer.analyze()
            complexity_scores = comp_analyzer.analyze()
            
            # 4. AI Insights
            audit_data = {
                "repo_url": repo_url,
                "architecture": architecture,
                "dependencies": [d.dict() for d in dependencies],
                "security_findings": [f.dict() for f in security_findings],
                "complexity_scores": complexity_scores
            }
            
            insights = await self.ai.generate_summary(audit_data)
            
            # 5. Persist Results
            self.db.update_audit(
                audit_id=audit_id,
                scores=insights.get("scores", {}),
                summary=insights.get("summary", "No summary available."),
                status="completed"
            )
            
            # 6. Persist Findings
            # Convert AI risks to findings as well? Or just use security findings?
            self.db.add_findings(audit_id, audit_data["security_findings"])
            
            return audit_id
            
        except Exception as e:
            self.db.update_audit(audit_id, {}, f"Error during audit: {str(e)}", status="failed")
            raise e
        finally:
            scanner.cleanup()
