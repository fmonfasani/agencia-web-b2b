import psycopg2
import psycopg2.extras
import os
import json
from typing import List

class AuditorDB:
    def __init__(self, db_url: str = None):
        self.db_url = db_url or os.getenv("DATABASE_URL")

    def get_conn(self):
        return psycopg2.connect(self.db_url, cursor_factory=psycopg2.extras.RealDictCursor)

    def create_audit(self, repository_url: str) -> str:
        with self.get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO \"Audit\" (repository_url, status) VALUES (%s, 'pending') RETURNING id",
                    (repository_url,)
                )
                conn.commit()
                return cur.fetchone()["id"]

    def update_audit(self, audit_id: str, scores: dict, summary: str, status: str = "completed"):
        with self.get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE \"Audit\"
                    SET \"overallScore\" = %s, \"architectureScore\" = %s, \"securityScore\" = %s, 
                        \"codeQualityScore\" = %s, \"devopsScore\" = %s, summary = %s, status = %s
                    WHERE id = %s
                    """,
                    (
                        scores.get("overall"), scores.get("architecture"), scores.get("security"),
                        scores.get("code_quality"), scores.get("devops"), summary, status, audit_id
                    )
                )
                conn.commit()

    def add_findings(self, audit_id: str, findings: List[dict]):
        with self.get_conn() as conn:
            with conn.cursor() as cur:
                for f in findings:
                    cur.execute(
                        """
                        INSERT INTO \"Finding\" (id, \"auditId\", severity, category, file, line, message, recommendation)
                        VALUES (concat('f_', gen_random_uuid()), %s, %s, %s, %s, %s, %s, %s)
                        """,
                        (audit_id, f["severity"], f["category"], f.get("file"), f.get("line"), f["message"], f["recommendation"])
                    )
                conn.commit()
