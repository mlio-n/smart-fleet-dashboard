"""
database.py
-----------
Establishes the SQLAlchemy engine and session factory for the SQLite backend.
All other modules import `SessionLocal` and `Base` from here.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# SQLite database file will be created in the project root.
DATABASE_URL = "sqlite:///./smart_fleet.db"

# `check_same_thread=False` is required for SQLite when used with FastAPI
# because multiple threads may access the same connection during request handling.
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)

# Each request gets its own independent database session.
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""
    pass


def get_db():
    """
    FastAPI dependency that yields a database session and guarantees
    the session is closed after the request finishes, even on errors.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
