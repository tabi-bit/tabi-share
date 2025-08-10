# Backend Server

FastAPI + PostgreSQL + Alembicを使用したバックエンドAPI

## 開発環境手順

### 前提条件
- Docker Desktopがインストールされている
- VS Code + Dev Containers拡張機能がインストールされている

### devcontainer環境でのセットアップ

1. **devcontainer起動**
    ```bash
    cd tabi-share
    # VS Codeでプロジェクトを開く
    # Ctrl+Shift+P → "Dev Containers: Reopen in Container"
    ```

2. **データベースマイグレーション**
    ```bash
    cd server

    # 最新のマイグレーションを適用
    npx dotenvx run --env-file ../.env -- alembic -n devdb upgrade head
    ```

3. **開発サーバー起動**
    ```bash
    npm run dev
    ```


### アクセス先
- フロントエンド: http://localhost:3000 (または5173)
- バックエンドAPI: http://localhost:8000
- API自動ドキュメント: http://localhost:8000/docs
- 代替ドキュメント: http://localhost:8000/redoc

## 開発ワークフロー（devcontainer環境）

### 環境変数の変更手順

1. **環境変数の復号化**
    ```bash
    cd tabi-share

    npx dotenvx decrypt
    ```

2. **.envファイルをIDEで編集する**

3. **環境変数の暗号化**
    ```bash
    npx detenvx encrypt
    ```

### パッケージの追加手順
```bash
cd server

# アプリケーションが使用するパッケージの場合(例: fastapi)
uv add fastapi

# dev環境でのみ使用するパッケージの場合(例: pytest)
uv add --dev pytest
```

### DBのマイグレーションファイル作成・適用手順

1. **server/app/models.pyにモデルを追加する**

2. **マイグレーションファイルを生成する**
    ```bash
    cd server
    npx dotenvx run --env-file ../.env -- alembic -n devdb revision --autogenerate -m "file_name"
    ```

3. **マイグレーションファイルをDBに適用する**
    ```bash
    # 現在のバージョンを確認する
    npx dotenvx run --env-file ../.env -- alembic -n devdb current

    # 最新版を適用する場合
    npx dotenvx run --env-file ../.env -- alembic -n devdb upgrade head

    # バージョンを1つだけ上げる場合
    npx dotenvx run --env-file ../.env -- alembic -n devdb upgrade +1

    # 最古版を適用する場合
    npx dotenvx run --env-file ../.env -- alembic -n devdb downgrade base

    # バージョンを1つだけ下げる場合
    npx dotenvx run --env-file ../.env -- alembic -n devdb downgrade -1

    # 更新後のバージョンを確認する
    npx dotenvx run --env-file ../.env -- alembic -n devdb current
    ```

### DBに直接アクセスする方法
- 環境変数の値を使ってアクセスする
  ```bash
  cd tabi-share

  npx dotenvx run -- sh -c 'psql -U $POSTGRES_USER -h $POSTGRES_HOST -d $POSTGRES_DB'
  ```
- よく使用するコマンド
  ```bash
  \l # List Databases
  \dt # List Tables
  \du # List Users (Roles)
  \d [table_name] # Describe Table/Relation
  \c [database_name] # Connect to Database
  ```

### 新機能開発
1. **機能ブランチ作成**
    ```bash
    git switch -c feature/your-feature-name
    ```

2. **モデル定義** (`app/models.py`)
    ```python
    class YourModel(Base):
        __tablename__ = "your_table"
        id = Column(Integer, primary_key=True, index=True)
        # フィールド定義
    ```

3. **マイグレーション生成・適用**
    ```bash
    cd server
    npx dotenvx run --env-file ../.env -- alembic -n devdb revision --autogenerate -m "file_name"
    npx dotenvx run --env-file ../.env -- alembic upgrade head
    ```

4. **スキーマ定義** (`app/schemas.py`)
    ```python
    class YourModelCreate(BaseModel):
        # 作成用スキーマ

    class YourModelResponse(BaseModel):
        # レスポンス用スキーマ
        class Config:
            from_attributes = True
    ```

5. **CRUD操作実装** (`app/cruds/your_model.py`)
    ```python
    async def create_your_model(db: Session, model_data: YourModelCreate):
        # CRUD実装
    ```

6. **APIルーター実装** (`app/routers/your_model.py`)
    ```python
    @router.post("/", response_model=YourModelResponse)
    async def create_endpoint(
        model_data: YourModelCreate,
        db: Session = Depends(get_db)
    ):
        # エンドポイント実装
    ```

### テスト実行
#### VScodeのテスト機能を使った実行方法
- アクティビティバーのテストを押し、対象のテストファイルを実行する場合
- Terminalから実行する場合
    ```bash
    cd server
    # 全テスト実行
    npx dotenvx run --env-file ../.env -- uv run pytest

    # 特定のテストファイル
    npx dotenvx run --env-file ../.env -- uv run pytest tests/test_your_model.py

    # 特定のテストクラス・メソッド
    npx dotenvx run --env-file ../.env -- uv run pytest tests/test_your_model.pypytest tests/test_your_model.py::TestYourModel::test_create

    # 詳細出力
    npx dotenvx run --env-file ../.env -- uv run pytest -v

    # 失敗時即座に停止
    npx dotenvx run --env-file ../.env -- uv run pytest -x

    # print文を出力
    npx dotenvx run --env-file ../.env -- uv run pytest -s

    # 特定のマークのテストのみ実行
    npx dotenvx run --env-file ../.env -- uv run pytest -m "unit"
    npx dotenvx run --env-file ../.env -- uv run pytest -m "integration"
    ```

## よく使用するコマンド（devcontainer環境）


## API設計パターン

### 標準的なCRUDエンドポイント
```
GET    /api/v1/users/          # ユーザー一覧取得
POST   /api/v1/users/          # ユーザー作成
GET    /api/v1/users/{id}      # 特定ユーザー取得
PUT    /api/v1/users/{id}      # ユーザー更新
DELETE /api/v1/users/{id}      # ユーザー削除
```

### レスポンス形式
```json
{
  "data": {...},
  "message": "success",
  "status_code": 200
}

// エラー時
{
  "detail": "エラーメッセージ",
  "status_code": 400
}
```

## 開発ツール設定

### mypy設定
- 設定内容を整理して記述する
プロジェクトルートに`mypy.ini`または`pyproject.toml`で型チェック設定：

<!-- ```toml
# pyproject.toml内
[tool.mypy]
python_version = "3.13"
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true
disallow_incomplete_defs = true
check_untyped_defs = true
disallow_untyped_decorators = true

[[tool.mypy.overrides]]
module = [
    "tests.*",
]
ignore_errors = true
``` -->

### pytest設定
- 設定内容を整理して記述する
<!-- ```toml
# pyproject.toml内
[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
addopts = [
    "--strict-markers",
    "--strict-config",
    "--cov=app",
    "--cov-report=term-missing",
]
markers = [
    "unit: Unit tests",
    "integration: Integration tests",
    "slow: Slow running tests",
]
``` -->

## トラブルシューティング

**依存関係エラー**
```bash
# devcontainer内でキャッシュクリア
uv cache clean

# 依存関係再インストール
rm uv.lock
uv sync
```

## 品質管理

### 開発前チェックリスト
```bash
cd server

# 型チェック
mypy .

# テスト実行
npx dotenvx run --env-file ../.env -- uv run pytest

# マイグレーション確認
alembic check
```

## 参考リソース

- [FastAPI公式ドキュメント](https://fastapi.tiangolo.com/)
- [SQLAlchemy公式ドキュメント](https://docs.sqlalchemy.org/)
- [Alembic公式ドキュメント](https://alembic.sqlalchemy.org/)
- [Pydantic公式ドキュメント](https://docs.pydantic.dev/)
- [環境変数の保管場所](https://docs.google.com/document/d/1LaLMO-YLJvSX-0kv8u3eTqNX5iAsfBaWpUf3xvWddnw/edit?tab=t.0)

## コントリビューション

1. Issueを作成して変更内容を議論
2. 機能ブランチで開発
3. テストを追加・更新
4. プルリクエスト作成
5. コードレビュー後マージ

## ライセンス

[ライセンス情報を記載]
