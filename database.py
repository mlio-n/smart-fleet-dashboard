"""
database.py
-----------
Establishes the SQLAlchemy engine and session factory for the SQLite backend.
All other modules import `SessionLocal` and `Base` from here.
"""

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

# SQLite database file will be created in the project root.
DATABASE_URL = "sqlite:///./smart_fleet.db"

# `check_same_thread=False` is required for SQLite when used with FastAPI
# because multiple threads may access the same connection during request handling.
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)

@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """Enable Write-Ahead Logging (WAL) and memory caching for high concurrency."""
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.execute("PRAGMA cache_size=-64000")
    cursor.close()

# Each request gets its own independent database session.
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""
    pass


from collections.abc import Generator


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency that yields a database session and guarantees
    the session is closed after the request finishes, even on errors.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
