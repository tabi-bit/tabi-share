import pytest
from app.cruds.users import (
    create_user,
    delete_user,
    find_users,
    get_password_hash,
    get_user,
    get_user_by_email,
)
from app.models import Base, User  # noqa: F401
from app.schemas import UserCreate
from sqlalchemy.orm import Session


@pytest.mark.asyncio
async def test_get_password_hash():
    """
    get_password_hash()の正常系テスト
    """
    # arrange
    password = "test_password"

    # act
    hashed = await get_password_hash(password)

    # assert
    # ハッシュ化されたパスワードが返ることを確認
    assert isinstance(hashed, str)
    assert hashed != password


@pytest.mark.asyncio
async def test_create_user(db_session: Session):
    """
    create_user()の正常系テスト
    """
    # arrange
    user_in = UserCreate(email="test@example.com", password="password")

    # act
    db_user = await create_user(db=db_session, user=user_in)

    # assert
    # 期待通りにユーザーが作成されたか検証
    assert db_user.email == user_in.email
    assert db_user.hashed_password == "password_hashed"
    assert db_user.id is not None

    # 実際にデータベースに保存されたか検証
    stored_user = db_session.query(User).filter(User.id == db_user.id).first()
    assert stored_user is not None
    assert stored_user.email == user_in.email


@pytest.mark.asyncio
async def test_get_user(db_session: Session):
    """
    get_user()の正常系テスト
    """
    # arrange
    user_in = UserCreate(email="test@example.com", password="password")
    created_user = await create_user(db=db_session, user=user_in)

    # act
    # IDでユーザーを取得できるか検証
    retrieved_user = await get_user(db=db_session, user_id=created_user.id)

    # assert
    assert retrieved_user is not None
    assert retrieved_user.id == created_user.id
    assert retrieved_user.email == created_user.email

    # act
    # 存在しないIDでNoneが返るか検証
    non_existent_user = await get_user(db=db_session, user_id=999)

    # assert
    assert non_existent_user is None


@pytest.mark.asyncio
async def test_get_user_by_email(db_session: Session):
    """
    get_user_by_email()の正常系テスト
    """
    # arrange
    email = "test@example.com"
    user_in = UserCreate(email=email, password="password")
    await create_user(db=db_session, user=user_in)

    # act
    # emailでユーザーを取得できるか検証
    retrieved_user = await get_user_by_email(db=db_session, email=email)

    # assert
    assert retrieved_user is not None
    assert retrieved_user.email == email

    # act
    # 存在しないemailでNoneが返るか検証
    non_existent_user = await get_user_by_email(
        db=db_session, email="wrong@example.com"
    )

    # assert
    assert non_existent_user is None


@pytest.mark.asyncio
async def test_get_users(db_session: Session):
    """
    get_users()の正常系テスト
    """
    # arrange
    await create_user(db_session, UserCreate(email="test1@example.com", password="p1"))
    await create_user(db_session, UserCreate(email="test2@example.com", password="p2"))

    # act
    # 全ユーザーを取得できるか検証
    users = await find_users(db=db_session, skip=0, limit=10)

    # assert
    assert len(users) == 2
    assert users[0].email == "test1@example.com"
    assert users[1].email == "test2@example.com"

    # act
    # skipとlimitが機能するか検証
    users_skipped = await find_users(db=db_session, skip=1, limit=1)

    # assert
    assert len(users_skipped) == 1
    assert users_skipped[0].email == "test2@example.com"


@pytest.mark.asyncio
async def test_delete_user(db_session: Session):
    """
    delete_user_()の正常系テスト
    """
    # arrange
    user_in = UserCreate(email="test_delete@example.com", password="password")
    created_user = await create_user(db=db_session, user=user_in)
    user_id = created_user.id

    # act
    # ユーザーを削除
    deleted_user = await delete_user(db=db_session, user_id=user_id)

    # assert
    # 削除されたユーザー情報が返されるか検証
    assert deleted_user is not None
    assert deleted_user.id == user_id
    assert await get_user(db_session, user_id) is None

    # act
    # 存在しないユーザーを削除しようとした場合にNoneが返るか検証
    deleted_non_existent = await delete_user(db=db_session, user_id=999)

    # assert
    assert deleted_non_existent is None
