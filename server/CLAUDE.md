# バックエンド規約

## 技術スタック
- FastAPI 0.115.x + Python 3.13 + Uvicorn
- PostgreSQL
- Firebase Authentication
- Alembic (マイグレーション管理)

## ディレクトリ構成

```
server/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPIアプリケーションのエントリーポイント
│   ├── db_connection.py     # データベース接続設定
│   ├── models.py            # SQLAlchemyモデル定義
│   ├── schemas.py           # Pydanticスキーマ定義
│   ├── errors.py            # カスタム例外クラス
│   ├── cruds/               # CRUD操作
│   │   └── *.py
│   └── routers/             # APIルーター
│       └── *.py
├── migrations/              # Alembicマイグレーションファイル
├── tests/                   # テストファイル
├── alembic.ini              # Alembic設定
├── pyproject.toml           # プロジェクト設定・依存関係
└── uv.lock                  # 依存関係ロックファイル
```

## 命名規則
- **変数・関数**: snake_case (`get_user_data`)
- **クラス**: PascalCase (`TripService`)
- **定数**: UPPER_SNAKE_CASE (`DATABASE_URL`)
- **ファイル名**: snake_case (`trip_service.py`)

## 開発ガイドライン

### 1. APIエンドポイント設計
- RESTfulな設計を採用
- エンドポイントパス: `/api/v1/{resource}`
- HTTPメソッド適切な使用（GET, POST, PUT, DELETE, PATCH）
- レスポンス形式は一貫性を保つ

### 2. データベース操作
- SQLAlchemyのORM使用
- モデル定義は`models.py`に集約
- CRUD操作は`cruds/`ディレクトリに分離
- トランザクション管理を適切に実装

### 3. スキーマ定義
- Pydanticモデルを`schemas.py`で管理
- リクエスト/レスポンススキーマを明確に分離
- バリデーション規則を適切に設定

### 4. エラーハンドリング
- カスタム例外は`errors.py`で定義
- HTTPステータスコードを適切に使用
- エラーメッセージは統一されたフォーマット

### 5. 認証・認可
- Firebase Authenticationトークン検証
- デコレーターまたはミドルウェアで認証実装
- ユーザー権限チェック機能

### 6. マイグレーション管理
- Alembicを使用したスキーマ変更管理
- マイグレーションファイルは意味のある名前を付与
- 本番環境への適用前にステージング環境でテスト

### 7. テスト戦略
- pytest使用
- テストファイルは`test_`プレフィックス
- ユニットテスト、統合テストを実装
- テストデータベースは本番と分離

### 8. 環境設定
- 環境変数で設定管理
- `.env`ファイルでローカル開発設定
- 本番、ステージング、開発環境の設定分離

### 9. ログ設定
- 構造化ログを推奨
- ログレベル適切な設定（DEBUG, INFO, WARNING, ERROR）
- 機密情報のログ出力禁止

### 10. パフォーマンス考慮事項
- データベースクエリ最適化
- 適切なインデックス設定
- キャッシュ戦略の検討
- 非同期処理の活用

## コーディング規約

### インポート順序
```python
# 1. 標準ライブラリ
import os
from datetime import datetime

# 2. サードパーティライブラリ
from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session

# 3. ローカルモジュール
from app.db_connection import get_db
from app.models import User
```

### 関数・クラス定義
```python
# 関数定義例
async def get_user_by_id(
    user_id: int,
    db: Session = Depends(get_db)
) -> User:
    """ユーザーIDでユーザー情報を取得"""
    pass

# クラス定義例
class UserService:
    """ユーザー関連のビジネスロジック"""

    def __init__(self, db: Session):
        self.db = db

    async def create_user(self, user_data: UserCreate) -> User:
        """新規ユーザー作成"""
        pass
```

### エラーハンドリングパターン
```python
from fastapi import HTTPException, status

# カスタム例外
class UserNotFoundError(Exception):
    pass

# エラーハンドラー
async def get_user_endpoint(user_id: int, db: Session = Depends(get_db)):
    try:
        user = await get_user_by_id(user_id, db)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        return user
    except UserNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
```

## セキュリティ要件
- SQLインジェクション対策（ORMパラメータ化クエリ使用）
- CORS設定適切な実装
- 入力値検証の徹底
- 機密情報の環境変数管理
- ログに機密情報を出力しない

## AI開発サポート情報

### よく使用するコマンド
```bash
# 開発サーバー起動
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# マイグレーション生成
alembic revision --autogenerate -m "migration_description"

# マイグレーション適用
alembic upgrade head

# テスト実行
pytest tests/

# 依存関係更新
uv lock
```

### 開発時の注意点
- 新機能開発時は必ずテストを作成
- データベーススキーマ変更時はマイグレーション作成
- APIドキュメントは自動生成される（FastAPI Swagger UI）
- 環境変数の変更時は`.env.example`も更新

### デバッグ情報
- FastAPI自動ドキュメント: `http://localhost:8000/docs`
- 代替ドキュメント: `http://localhost:8000/redoc`

### パッケージ管理
- uv使用（Pythonパッケージマネージャー）
- 新パッケージ追加: `uv add package_name`
- 開発用パッケージ: `uv add --dev package_name`
- 依存関係確認: `uv tree`

