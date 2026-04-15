from collections.abc import Callable

from fastapi import HTTPException, Request
from starlette.responses import Response

from app.core.security import verify_token


async def auth_middleware(request: Request, call_next: Callable[[Request], Response]) -> Response:
    if request.url.path.startswith("/api/auth") or request.url.path == "/health":
        return await call_next(request)

    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="NO_TOKEN")

    try:
        scheme, token = auth_header.split(" ", 1)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="INVALID_AUTH_HEADER") from exc

    if scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="INVALID_AUTH_SCHEME")

    try:
        payload = verify_token(token)
        request.state.user = payload
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="INVALID_TOKEN") from exc

    return await call_next(request)
