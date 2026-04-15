from sqlalchemy import Column, ForeignKey, String

from app.core.database import Base


class APIKey(Base):
    __tablename__ = "api_keys"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False, index=True)
    key_hash = Column(String, nullable=False)
