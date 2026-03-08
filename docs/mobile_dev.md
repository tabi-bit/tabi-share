# モバイル端末での動作確認

## 概要

開発中のアプリをスマートフォンなどのモバイル端末から確認するための手順です。
同一ネットワーク内のモバイル端末から開発サーバーにアクセスできるようにするため、2つのファイルを手動で修正します。

## 対応環境

| 環境 | 状態 |
| --- | --- |
| Windows (WSL) | 検証済み |
| Linux | 未検証 |
| macOS | 未検証 |

## 前提条件

- モバイル端末と開発マシンが同一ネットワーク（Wi-Fi等）に接続されていること
- 開発環境のセットアップが完了していること（`./scripts/setup.sh`）

## 手順

### 1. ホストマシンのIPアドレスを確認する

#### Windows (WSL) の場合

Windows側で以下のいずれかのコマンドを実行してください：

**PowerShell:**

```powershell
(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback|vEthernet' -and $_.PrefixOrigin -in @('Dhcp','Manual') }).IPAddress
```

**cmd:**

```cmd
ipconfig
```

Wi-FiまたはイーサネットのIPv4アドレス（例: `192.168.1.10`）を控えてください。

### 2. `.env` の `VITE_API_BASE_URL` を修正する

プロジェクトルートの `.env` ファイルにある `VITE_API_BASE_URL` を、確認したIPアドレスに書き換えます。

```bash
npx dotenvx set VITE_API_BASE_URL "http://<IPアドレス>:8000"
```

例: IPアドレスが `192.168.1.10` の場合

```bash
npx dotenvx set VITE_API_BASE_URL "http://192.168.1.10:8000"
```

### 3. `server/app/main.py` の CORS設定を修正する

`server/app/main.py` の `allow_origins` にモバイル端末からのオリジンを追加します。

**変更前:**

```python
allow_origins=["http://localhost:5173", "http://localhost:3000"],
```

**変更後:**

```python
allow_origins=["http://localhost:5173", "http://localhost:3000", "http://<IPアドレス>:5173"],
```

### 4. 開発サーバーを起動（または再起動）する

```bash
npx dotenvx run -- npm run dev
```

### 5. モバイル端末からアクセスする

モバイル端末のブラウザから以下のURLにアクセスします：

- **フロントエンド**: `http://<IPアドレス>:5173`
- **バックエンドAPI**: `http://<IPアドレス>:8000`

## 注意事項

- 設定変更後は必ず開発サーバーを再起動してください
- ネットワーク環境が変わった場合（Wi-Fi切替など）は再度IPアドレスを確認し、上記の修正をやり直してください
- `.env` と `server/app/main.py` の変更はローカル環境のみに反映されます。コミットしないよう注意してください
