from pydantic import BaseModel, EmailStr

# Userの基本となるスキーマ
class UserBase(BaseModel):
    email: EmailStr

# User作成時に受け取るデータ（パスワードを含む）
class UserCreate(UserBase):
    password: str

# User更新時に受け取るデータ
class UserUpdate(UserBase):
    is_active: bool

# APIから返すUserデータ（パスワードは含めない）
class User(UserBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True # SQLAlchemyモデルをPydanticモデルに変換
