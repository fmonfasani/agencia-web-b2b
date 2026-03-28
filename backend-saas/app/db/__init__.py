from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

DATABASE_URL = None  # will be loaded from env in runtime

def get_engine(url: str):
    return create_async_engine(url, future=True, echo=False)

def get_sessionmaker(url: str):
    engine = create_async_engine(url, future=True, echo=False)
    return sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
