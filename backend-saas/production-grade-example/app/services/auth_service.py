from app.core.security import create_token


class AuthService:
    @staticmethod
    def login(email: str) -> str:
        is_admin = "admin" in email
        return create_token(
            {
                "user_id": "u_1",
                "tenant_id": "t_123",
                "role": "ADMIN" if is_admin else "MEMBER",
                "type": "admin" if is_admin else "tenant",
            }
        )
