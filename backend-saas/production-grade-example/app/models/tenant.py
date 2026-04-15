from sqlalchemy import Column, String

from app.core.database import Base


class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    plan = Column(String, nullable=False, default="free")
