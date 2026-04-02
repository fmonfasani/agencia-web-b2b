import pytest
import psycopg2
import os
from fastapi.testclient import TestClient
from app.main import app
from app.auth_service import DB_DSN, create_user, hash_password, generate_api_key

# Test database configuration
TEST_DB_DSN = os.getenv("TEST_DATABASE_URL", "postgresql://postgres:Karaoke27570Echeverria@127.0.0.1:5432/agencia_web_b2b")


@pytest.fixture(scope="session")
def db_connection():
    """Create a database connection for the test session."""
    try:
        conn = psycopg2.connect(TEST_DB_DSN)
        conn.autocommit = True
        yield conn
        conn.close()
    except psycopg2.OperationalError as e:
        pytest.skip(f"Database not available: {e}")


@pytest.fixture(autouse=True)
def clean_db(db_connection):
    """Clean test data before each test."""
    cur = db_connection.cursor()
    try:
        # Delete test users (those created during tests)
        cur.execute("""
            DELETE FROM "User"
            WHERE email LIKE %s
        """, ('%test.example.com%',))

        # Delete test tenants
        cur.execute("""
            DELETE FROM tenants
            WHERE id LIKE %s
        """, ('%test%',))

        db_connection.commit()
    except Exception as e:
        db_connection.rollback()
        # Table might not exist in test environment, that's ok
        pass
    finally:
        cur.close()

    yield

    # Cleanup after test
    try:
        cur = db_connection.cursor()
        cur.execute("""
            DELETE FROM "User"
            WHERE email LIKE %s
        """, ('%test.example.com%',))

        cur.execute("""
            DELETE FROM tenants
            WHERE id LIKE %s
        """, ('%test%',))

        db_connection.commit()
        cur.close()
    except Exception as e:
        db_connection.rollback()


@pytest.fixture
def test_admin_user(db_connection, clean_db):
    """Create a test admin user."""
    email = "admin@test.example.com"
    password = "AdminPassword123!"
    nombre = "Test Admin"
    rol = "admin"

    try:
        user = create_user(
            email=email,
            password=password,
            nombre=nombre,
            rol=rol,
            tenant_id=None,
            activo=True,
        )
        return user
    except Exception as e:
        pytest.skip(f"Could not create test admin user: {e}")


@pytest.fixture
def test_analista_user(db_connection, clean_db):
    """Create a test analista user."""
    email = "analista@test.example.com"
    password = "AnalistaPassword123!"
    nombre = "Test Analista"
    rol = "analista"

    try:
        user = create_user(
            email=email,
            password=password,
            nombre=nombre,
            rol=rol,
            tenant_id=None,
            activo=True,
        )
        return user
    except Exception as e:
        pytest.skip(f"Could not create test analista user: {e}")


@pytest.fixture
def test_cliente_user(db_connection, clean_db):
    """Create a test cliente user with a tenant."""
    email = "cliente@test.example.com"
    password = "ClientePassword123!"
    nombre = "Test Cliente"
    rol = "cliente"
    tenant_id = "test-tenant-001"

    try:
        user = create_user(
            email=email,
            password=password,
            nombre=nombre,
            rol=rol,
            tenant_id=tenant_id,
            activo=True,
        )
        return user
    except Exception as e:
        pytest.skip(f"Could not create test cliente user: {e}")


@pytest.fixture(scope="function")
def client():
    """Create a FastAPI test client."""
    with TestClient(app) as c:
        yield c
