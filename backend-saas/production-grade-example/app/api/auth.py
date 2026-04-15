from fastapi import APIRouter

from app.schemas.auth import LoginRequest, TokenResponse
from app.services.auth_service import AuthService

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login_route(payload: LoginRequest) -> TokenResponse:
    token = AuthService.login(payload.email)
    return TokenResponse(access_token=token)
