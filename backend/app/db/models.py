from sqlalchemy import Column, String, Integer, DateTime, Text
from sqlalchemy.orm import declarative_base

Base = declarative_base()

import uuid
from datetime import datetime

class AgentExecution(Base):
    __tablename__ = 'agent_executions'
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, index=True, nullable=False)
    agent_id = Column(String, nullable=False)
    task = Column(Text, nullable=False)
    input_data = Column(Text)
    context = Column(Text)
    output = Column(Text)
    tokens_used = Column(Integer, default=0)
    iterations = Column(Integer, default=0)
    status = Column(String, default='PENDING')
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)

class AgentMessage(Base):
    __tablename__ = 'agent_messages'
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    execution_id = Column(String, index=True, nullable=False)
    role = Column(String, nullable=False) # 'user', 'assistant', 'system', 'tool'
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

class RagQuery(Base):
    __tablename__ = 'rag_queries'
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    execution_id = Column(String, index=True, nullable=False)
    tenant_id = Column(String, index=True, nullable=False)
    query_text = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

class RagResult(Base):
    __tablename__ = 'rag_results'
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    query_id = Column(String, index=True) # Optional link to RagQuery
    execution_id = Column(String, index=True, nullable=False)
    chunk_id = Column(String)
    text = Column(Text, nullable=False)
    score = Column(Integer)
    source = Column(String)
