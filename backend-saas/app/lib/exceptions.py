"""
Custom exceptions for consistent error handling across the API.
"""


class WebshooksException(Exception):
    """Base exception for all Webshooks errors."""
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class InvalidCredentialsError(WebshooksException):
    def __init__(self, message: str = "Email o contraseña inválidos"):
        super().__init__(message, 401)


class UserNotFoundError(WebshooksException):
    def __init__(self, email: str):
        super().__init__(f"Usuario con email '{email}' no encontrado", 404)


class UserInactiveError(WebshooksException):
    def __init__(self, email: str):
        super().__init__(f"Usuario '{email}' está inactivo. Contactá a un administrador.", 403)


class DuplicateEmailError(WebshooksException):
    def __init__(self, email: str):
        super().__init__(f"Email '{email}' ya está registrado", 409)


class TenantNotFoundError(WebshooksException):
    def __init__(self, tenant_id: str):
        super().__init__(f"Tenant '{tenant_id}' no encontrado", 404)


class InvalidTenantIdError(WebshooksException):
    def __init__(self, tenant_id: str):
        super().__init__(f"Tenant ID inválido: '{tenant_id}'. Debe ser alfanumérico y sin espacios.", 400)


class UnauthorizedTenantAccessError(WebshooksException):
    def __init__(self, tenant_id: str):
        super().__init__(f"No tenés acceso al tenant '{tenant_id}'", 403)


class FileUploadError(WebshooksException):
    def __init__(self, message: str):
        super().__init__(f"Error al subir archivo: {message}", 400)


class OnboardingIncompleteError(WebshooksException):
    def __init__(self, missing_steps: list[str]):
        super().__init__(
            f"Onboarding incompleto. Falta: {', '.join(missing_steps)}", 400
        )
