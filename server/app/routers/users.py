from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.cruds import users as users_cruds
from app.db_connection import get_db_session
from app.schemas import User, UserCreate

router = APIRouter()

_RESPONSES_CREATE_USER: dict[int | str, dict[str, Any]] = {
    200: {
        "description": "User created successfully",
        "content": {
            "application/json": {"example": {"id": 1, "email": "test@abc.com"}}
        },
    },
    400: {
        "description": "Email already registered",
        "content": {
            "application/json": {"example": {"detail": "Email already registered"}}
        },
    },
    500: {
        "description": "Internal server error",
        "content": {
            "application/json": {"example": {"detail": "Internal server error"}}
        },
    },
}


@router.post(
    "/",
    summary="ユーザー作成",
    operation_id="users-create",
    response_model=User,
    responses=_RESPONSES_CREATE_USER,
)
async def post_user(user: UserCreate, db: Session = Depends(get_db_session)) -> User:
    """
    説明:

    - 指定されたメールアドレスとパスワードで新しいユーザーを作成する
    - 既に登録されているメールアドレスの場合はエラーを返す
    """
    db_user = await users_cruds.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return await users_cruds.create_user(db=db, user=user)


@router.get(
    "/",
    summary="ユーザー一覧取得",
    operation_id="users-read",
    response_model=list[User],
    # responses=_RESPONSES_LIST_USER,
)
async def list_users(
    skip: int = 0, limit: int = 100, db: Session = Depends(get_db_session)
) -> list[User]:
    """
    説明:

    - 登録されている全ユーザーの一覧を取得する
    - `skip`と`limit`パラメータでページネーションが可能
    """
    users = await users_cruds.find_users(db, skip=skip, limit=limit)
    list_users = [
        User(id=user.id, email=user.email, is_active=user.is_active) for user in users
    ]

    return list_users


@router.get(
    "/{user_id}",
    summary="ユーザー取得",
    operation_id="users-read-by-id",
    # responses=_RESPONSES_GET_USER,
    response_model=User,
)
async def get_user(user_id: int, db: Session = Depends(get_db_session)):
    db_user = await users_cruds.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user


@router.delete("/{user_id}", response_model=User)
async def delete_user(user_id: int, db: Session = Depends(get_db_session)):
    db_user = await users_cruds.delete_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user
