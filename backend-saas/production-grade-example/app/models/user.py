from sqlalchemy import Column, ForeignKey, String

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password = Column(String, nullable=False)
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False, index=True)
    role = Column(String, nullable=False)  # ADMIN, MEMBER
    type = Column(String, nullable=False)  # admin | tenant
