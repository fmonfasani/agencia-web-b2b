"""
auth_models.py — Modelos Pydantic para autenticación
"""
from pydantic import BaseModel, EmailStr
from typing import Optional
from enum import Enum


class Rol(str, Enum):
    admin    = "admin"
    analista = "analista"
    cliente  = "cliente"


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    nombre: str
    rol: Rol = Rol.cliente
    tenant_id: Optional[str] = None  # obligatorio si rol=cliente


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    api_key: str
    email: str
    nombre: str
    rol: Rol
    tenant_id: Optional[str]
    mensaje: str


class UserResponse(BaseModel):
    id: int
    email: str
    nombre: str
    rol: Rol
    tenant_id: Optional[str]
    activo: bool


class ActivateRequest(BaseModel):
    user_id: int
    activo: bool
