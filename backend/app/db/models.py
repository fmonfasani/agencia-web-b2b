from sqlalchemy import Column, String, Integer, DateTime, Text
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class AgentExecution(Base):
    __tablename__ = 'agent_executions'
    id = Column(String, primary_key=True)
    tenant_id = Column(String, index=True, nullable=False)
    task = Column(Text, nullable=False)
    status = Column(String, default='PENDING')
    created_at = Column(DateTime)
    updated_at = Column(DateTime)
