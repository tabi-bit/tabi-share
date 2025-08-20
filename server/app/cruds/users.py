from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.models import User
from app.schemas import UserCreate

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def get_password_hash(password: str) -> str:
    """
    パスワードを暗号化する関数

    Args:
        password(str): 暗号化するパスワード

    Returns:
        str: 暗号化されたパスワード
    """
    return pwd_context.hash(password)


async def create_user(db: Session, user: UserCreate) -> User:
    """
    ユーザーをデータベースに作成する関数

    Args:
        db (Session): データベースセッション
        user (UserCreate): ユーザー作成用のスキーマ

    Returns:
        User: 作成されたユーザーオブジェクト
    """
    hashed_password = await get_password_hash(user.password)
    hashed_password = user.password + "_hashed"  # サンプルとしての簡単な処理
    db_user = User(email=user.email, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


async def get_user(db: Session, user_id: int) -> User | None:
    """
    ユーザーIDでユーザーを取得する関数

    Args:
        db (Session): データベースセッション
        user_id (int): ユーザーID

    Returns:
        User | None: ユーザーオブジェクトまたはNone
    """
    return db.query(User).filter(User.id == user_id).first()


async def get_user_by_email(db: Session, email: str) -> User | None:
    """
    emailでユーザーを取得する関数

    Args:
        db (Session): データベースセッション
        email (str): ユーザーのメールアドレス

    Returns:
        User | None: ユーザーオブジェクトまたはNone
    """
    return db.query(User).filter(User.email == email).first()


async def find_users(db: Session, skip: int = 0, limit: int = 100) -> list[User]:
    """
    ユーザーを取得する関数

    Args:
        db (Session): データベースセッション
        skip (int): スキップするレコード数
        limit (int): 取得するレコード数

    Returns:
        list[User]: ユーザーオブジェクトのリスト
    """
    return db.query(User).offset(skip).limit(limit).all()


async def delete_user(db: Session, user_id: int) -> User | None:
    """
    ユーザーを削除する関数

    Args:
        db (Session): データベースセッション
        user_id (int): ユーザーID

    Returns:
        User | None: 削除されたユーザーオブジェクトまたはNone
    """
    db_user = await get_user(db, user_id)
    if db_user:
        db.delete(db_user)
        db.commit()
    return db_user
