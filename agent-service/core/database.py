import psycopg2
import psycopg2.extras
import json
from core.config import settings

def get_conn():
    return psycopg2.connect(settings.database_url, cursor_factory=psycopg2.extras.RealDictCursor)

def get_agent(agent_id: str):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, name, system_prompt FROM agents WHERE id = %s AND active = true", (agent_id,))
            return cur.fetchone()

def verify_api_key(key_hash: str):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT ak.agent_id, a.name, a.system_prompt
                FROM agent_api_keys ak
                JOIN agents a ON a.id = ak.agent_id
                WHERE ak.key_hash = %s AND ak.active = true AND a.active = true
            """, (key_hash,))
            row = cur.fetchone()
            if row:
                cur.execute("UPDATE agent_api_keys SET last_used_at = now() WHERE key_hash = %s", (key_hash,))
                conn.commit()
            return row

def get_or_create_conversation(agent_id: str, session_id: str, metadata: dict):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, messages FROM conversations WHERE agent_id = %s AND session_id = %s", (agent_id, session_id))
            row = cur.fetchone()
            if row:
                return {"id": row["id"], "messages": row["messages"] or []}
            cur.execute(
                "INSERT INTO conversations (agent_id, session_id, metadata) VALUES (%s, %s, %s) RETURNING id, messages",
                (agent_id, session_id, json.dumps(metadata))
            )
            conn.commit()
            row = cur.fetchone()
            return {"id": row["id"], "messages": []}

def append_message(conversation_id: str, role: str, content: str):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE conversations
                SET messages = messages || %s::jsonb, updated_at = now()
                WHERE id = %s
            """, (json.dumps([{"role": role, "content": content}]), conversation_id))
            conn.commit()
