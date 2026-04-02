"""
tenant_models.py — Pydantic models for tenant management
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class TenantCreateRequest(BaseModel):
    nombre: str = Field(..., description="Nombre de la empresa/negocio")
    industria: str = Field(..., description="Industria: salud, ecommerce, servicios, etc.")
    descripcion: str = Field("", description="Descripción corta del negocio")


class TenantUpdateRequest(BaseModel):
    nombre: Optional[str] = None
    industria: Optional[str] = None
    descripcion: Optional[str] = None


class TenantResponse(BaseModel):
    id: str
    nombre: str
    industria: str
    descripcion: str
    created_by: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    activo: bool = True


class TenantListResponse(BaseModel):
    total: int
    tenants: list[TenantResponse]
