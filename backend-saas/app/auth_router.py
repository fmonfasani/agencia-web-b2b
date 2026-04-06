"""
auth_router.py — Endpoints de autenticación en FastAPI/Swagger
"""
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Security, Depends
from fastapi.security import APIKeyHeader

from app.auth_models import (
    RegisterRequest, LoginRequest, LoginResponse,
    UserResponse, ActivateRequest, Rol, RegisterCompanyRequest
)
from app.auth_service import (
    create_user, login_user, get_user_by_api_key,
    list_users, activate_user, setup_users_table
)
from app.lib.exceptions import (
    WebshooksException,
    InvalidCredentialsError,
    UserNotFoundError,
    UserInactiveError,
    DuplicateEmailError,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Setup de seguridad para Swagger
# ---------------------------------------------------------------------------

API_KEY_HEADER = APIKeyHeader(
    name="X-API-Key",
    description="API Key obtenida en POST /auth/login. Formato: wh_xxxxx",
    auto_error=False,
)


def get_current_user(api_key: str = Security(API_KEY_HEADER)) -> dict:
    """Dependency — valida la API key y retorna el usuario."""
    logger.info(f"[AUTH] get_current_user called with api_key: {api_key}")
    if not api_key:
        logger.warning("[AUTH] No API key provided in header")
        raise HTTPException(
            status_code=401,
            detail="API Key requerida. Usá POST /auth/login para obtenerla.",
            headers={"WWW-Authenticate": "ApiKey"},
        )
    user = get_user_by_api_key(api_key)
    logger.info(f"[AUTH] API Key lookup result: {user}")
    if not user:
        logger.warning(f"[AUTH] API Key not found or user inactive: {api_key[:20]}...")
        raise HTTPException(status_code=401, detail="API Key inválida o usuario inactivo")
    return user


def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user["rol"] not in ("ADMIN", "SUPER_ADMIN"):
        raise HTTPException(status_code=403, detail="Solo admins pueden realizar esta acción")
    return user


def require_analista_or_admin(user: dict = Depends(get_current_user)) -> dict:
    if user["rol"] not in ("ADMIN", "SUPER_ADMIN", "ANALISTA"):
        raise HTTPException(status_code=403, detail="Se requiere rol analista o admin")
    return user


# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

router = APIRouter(prefix="/auth", tags=["Autenticación"])

# Crear tabla al importar el router
# El esquema es manejado por Prisma.


@router.post(
    "/register",
    summary="Registrar nuevo usuario",
    description="""
Crea una nueva cuenta. El usuario queda **inactivo** hasta que un admin lo active.

## Roles

- **cliente** → requiere `tenant_id`. Solo puede consultar su propio negocio.
- **analista** → sin `tenant_id`. Puede gestionar todos los tenants.
- **admin** → solo puede ser creado por otro admin.

## Flujo típico

1. Cliente se registra → queda pendiente
2. Admin activa la cuenta en `POST /auth/activate`
3. Cliente hace login y obtiene su API key en `POST /auth/login`

## Ejemplo

**Cliente registrándose para un tenant específico:**
```json
{
  "email": "recepcionista@clinica.ar",
  "password": "segura123",
  "nombre": "María García",
  "rol": "cliente",
  "tenant_id": "clinica-x-buenos-aires"
}
```

Respuesta: Usuario creado pero inactivo. Admin debe activarlo primero.

**Analista registrándose (sin tenant):**
```json
{
  "email": "analista@webshooks.com",
  "password": "segura456",
  "nombre": "Juan Analista",
  "rol": "analista"
}
```
    """,
    response_model=dict,
)
async def register(req: RegisterRequest):
    try:
        user = create_user(
            email=req.email,
            password=req.password,
            nombre=req.nombre,
            rol=req.rol.value,
            tenant_id=req.tenant_id,
            activo=False,  # siempre inactivo hasta que admin active
        )
        return {
            "status": "pendiente",
            "mensaje": "Cuenta creada. Esperá que un administrador active tu cuenta.",
            "email": user["email"],
            "rol": user["rol"],
            "tenant_id": user["tenant_id"],
        }
    except DuplicateEmailError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except WebshooksException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Unexpected error in register: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.post(
    "/register-company",
    summary="Registrar nueva empresa",
    description="""
Crea una nueva empresa y un usuario administrador en un solo paso.

**Flujo:**
1. Proporciona datos de la empresa y el administrador
2. Se crea automáticamente la empresa (Tenant)
3. Se crea el usuario como ADMIN de la empresa
4. Recibís la API Key para usar inmediatamente

**Ejemplo:**
```json
{
  "firstName": "Juan",
  "lastName": "Pérez",
  "email": "admin@miempresa.com",
  "password": "Segura123!",
  "companyName": "Mi Empresa S.A.",
  "website": "https://miempresa.com"
}
```

**Respuesta exitosa:**
```json
{
  "id": "u_xxx",
  "email": "admin@miempresa.com",
  "firstName": "Juan",
  "lastName": "Pérez",
  "api_key": "wh_xxx",
  "company_name": "Mi Empresa S.A.",
  "company_id": "t_xxx",
  "role": "ADMIN",
  "status": "ACTIVE",
  "mensaje": "Empresa y usuario creados exitosamente. Por favor, inicia sesión."
}
```
    """,
    response_model=dict,
)
async def register_company(req: RegisterCompanyRequest):
    try:
        from app.auth_service import register_company as create_company
        result = create_company(
            email=req.email,
            password=req.password,
            firstName=req.firstName,
            lastName=req.lastName,
            companyName=req.companyName,
            website=req.website,
        )
        return result
    except DuplicateEmailError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except WebshooksException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Unexpected error in register_company: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.post(
    "/login",
    summary="Login — obtener API Key",
    description="""
Autentica al usuario y devuelve la **API Key** necesaria para todas las siguientes requests.

## Paso 1: Login

Enviá email y password. Recibirás tu `api_key`.

**Ejemplo:**
```json
{
  "email": "recepcionista@clinica.ar",
  "password": "segura123"
}
```

Respuesta:
```json
{
  "id": "user_123",
  "api_key": "wh_abc123xyz...",
  "email": "recepcionista@clinica.ar",
  "nombre": "María García",
  "rol": "cliente",
  "tenant_id": "clinica-x-buenos-aires",
  "mensaje": "Bienvenido María García. Copiá tu api_key y usala en Authorize."
}
```

## Paso 2: Usar la API Key

Copiá el valor de `api_key` y:

**Opción A:** Click en botón **Authorize** (arriba a la derecha en Swagger) y pegá el valor.

**Opción B:** Enviá en cada request con header:
```
X-API-Key: wh_abc123xyz...
```

## Vale para siempre

La API key NO expira. Usala en todas tus requests desde ahora.
    """,
    response_model=LoginResponse,
)
async def login(req: LoginRequest):
    try:
        user = login_user(req.email, req.password)
        return LoginResponse(
            id=user["id"],
            api_key=user["api_key"],
            email=user["email"],
            nombre=user["nombre"],
            rol=user["rol"],
            tenant_id=user["tenant_id"],
            mensaje=f"Bienvenido {user['nombre']}. Copiá tu api_key y usala en Authorize.",
        )
    except (InvalidCredentialsError, UserNotFoundError, UserInactiveError) as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except WebshooksException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Unexpected error in login: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.get(
    "/me",
    summary="Ver mi perfil",
    description="Retorna los datos del usuario autenticado.",
    response_model=UserResponse,
)
async def me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user["id"],
        email=user["email"],
        nombre=user["nombre"],
        rol=user["rol"],
        tenant_id=user["tenant_id"],
        activo=True,
    )


@router.get(
    "/users",
    summary="Listar todos los usuarios [ADMIN]",
    description="Solo admins. Lista todos los usuarios con su estado.",
    response_model=list[dict],
)
async def get_users(admin: dict = Depends(require_admin)):
    return list_users()


@router.post(
    "/activate",
    summary="Activar o desactivar usuario [ADMIN]",
    description="""
Solo admins. Activa o desactiva una cuenta de usuario.

Después de registrarse, los usuarios quedan inactivos hasta que un admin los active aquí.
    """,
    response_model=dict,
)
async def activate(req: ActivateRequest, admin: dict = Depends(require_admin)):
    try:
        user = activate_user(req.user_id, req.activo)
        estado = "activado" if req.activo else "desactivado"
        return {
            "status": "ok",
            "mensaje": f"Usuario {user['email']} {estado} correctamente",
            "user": user,
        }
    except UserNotFoundError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except WebshooksException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.post(
    "/create-analista",
    summary="Crear analista directamente [ADMIN]",
    description="Solo admins. Crea un analista ya activo, sin necesidad de aprobación.",
    response_model=dict,
)
async def create_analista(
    email: str,
    password: str,
    nombre: str,
    admin: dict = Depends(require_admin),
):
    try:
        user = create_user(
            email=email,
            password=password,
            nombre=nombre,
            rol="ANALISTA",
            activo=True,  # analista creado por admin ya está activo
        )
        return {
            "status": "ok",
            "mensaje": f"Analista {nombre} creado y activado",
            "email": user["email"],
            "api_key": user["api_key"],
        }
    except DuplicateEmailError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except WebshooksException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Error creating analyst: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")
