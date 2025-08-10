import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DEV_DB_USER = os.getenv("POSTGRES_USER")
DEV_DB_PASSWORD = os.getenv("POSTGRES_PASSWORD")
DEV_DB_HOST = os.getenv("POSTGRES_HOST", "localhost")
DEV_DB_PORT = os.getenv("POSTGRES_PORT", "5432")
DEV_DB_NAME = os.getenv("POSTGRES_DB")
DEV_DATABASE_URL = f"postgresql+psycopg2://{DEV_DB_USER}:{DEV_DB_PASSWORD}@{DEV_DB_HOST}:{DEV_DB_PORT}/{DEV_DB_NAME}"

engine = create_engine(DEV_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=True, bind=engine)

Base = declarative_base()


def get_db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
