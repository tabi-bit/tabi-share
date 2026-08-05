"""通知機能の CRUD 層。

- 購読 (device_subscriptions) の CRUD
- 送信ロック (sent_notifications) の INSERT-first 予約
- tick スキャン用のクエリ (未送信 & 未来 & minutes_before 以内)
"""

from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import and_, delete, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Block, DeviceSubscription, Location, Page, SentNotification, Trip
from app.schemas.notification import DeviceSubscriptionCreate

_KIND_BEFORE = "before_5min"

# 通知 body に載せる後続予定の上限件数 (docs/notifications.md §5)。
# プラットフォーム別の body 長 (iOS ~4 行 / Chrome Win 4 行 / Safari macOS 121 chars) を踏まえ、
# 現在予定 (1 行) + 場所行 (1 行) + 後続 2 件 = 4 行 body で iOS の展開に fit する件数。
_MAX_UPCOMING_BLOCKS = 2


async def upsert_subscription(
    db: AsyncSession,
    *,
    trip_id: int,
    payload: DeviceSubscriptionCreate,
) -> DeviceSubscription:
    """(fcm_token, trip_id) の購読を作成または更新する。

    既存レコードがあれば timezone / minutes_before / user_agent / last_seen_at を更新。
    """
    existing = await get_subscription(db, trip_id=trip_id, fcm_token=payload.fcm_token)

    if existing is not None:
        existing.timezone = payload.timezone
        existing.minutes_before = payload.minutes_before
        existing.user_agent = payload.user_agent
        existing.last_seen_at = datetime.now(UTC)
        await db.commit()
        await db.refresh(existing)
        return existing

    sub = DeviceSubscription(
        fcm_token=payload.fcm_token,
        trip_id=trip_id,
        timezone=payload.timezone,
        minutes_before=payload.minutes_before,
        user_agent=payload.user_agent,
    )
    db.add(sub)
    await db.commit()
    await db.refresh(sub)
    return sub


async def get_subscription(
    db: AsyncSession, *, trip_id: int, fcm_token: str
) -> DeviceSubscription | None:
    result = await db.execute(
        select(DeviceSubscription).where(
            and_(
                DeviceSubscription.trip_id == trip_id,
                DeviceSubscription.fcm_token == fcm_token,
            )
        )
    )
    return result.scalar_one_or_none()


async def delete_subscription(
    db: AsyncSession, *, trip_id: int, fcm_token: str
) -> bool:
    """指定の (fcm_token, trip_id) 購読を削除。存在した場合 True。"""
    result = await db.execute(
        delete(DeviceSubscription).where(
            and_(
                DeviceSubscription.trip_id == trip_id,
                DeviceSubscription.fcm_token == fcm_token,
            )
        )
    )
    await db.commit()
    return (result.rowcount or 0) > 0


async def delete_all_subscriptions_by_fcm_token(
    db: AsyncSession, *, fcm_token: str
) -> int:
    """FCM token 失効時に全 trip 分の購読を削除。"""
    result = await db.execute(
        delete(DeviceSubscription).where(DeviceSubscription.fcm_token == fcm_token)
    )
    await db.commit()
    return result.rowcount or 0


async def try_reserve_send_slot(
    db: AsyncSession,
    *,
    block_id: int,
    fcm_token: str,
    kind: str = _KIND_BEFORE,
) -> bool:
    """送信ロックを INSERT-first で獲得する。

    ON CONFLICT DO NOTHING で競合 tick でも 1 プロセスだけ True を返す。
    Return True: この呼び出しで挿入成功 = 送信権を獲得した (呼び出し側は送信すること)
    Return False: 既に存在する = 他プロセスが送信済み or 送信中
    """
    stmt = (
        pg_insert(SentNotification)
        .values(block_id=block_id, fcm_token=fcm_token, kind=kind)
        .on_conflict_do_nothing(
            index_elements=[
                SentNotification.block_id,
                SentNotification.fcm_token,
                SentNotification.kind,
            ]
        )
    )
    result = await db.execute(stmt)
    await db.commit()
    return (result.rowcount or 0) > 0


async def delete_sent_notifications_for_block(
    db: AsyncSession, *, block_id: int
) -> int:
    """指定 block の送信済み予約を全て削除する。

    block の start_time が変更された場合に呼ぶ。次 tick で再送候補として復活する。
    kind は絞らない: 将来別種類 (前日通知等) が追加されても start_time 変更で全て無効化される。
    commit は呼ばない (呼び出し側の update トランザクションに乗せる)。
    """
    result = await db.execute(
        delete(SentNotification).where(SentNotification.block_id == block_id)
    )
    return result.rowcount or 0


async def delete_sent_notifications_for_page(
    db: AsyncSession, *, page_id: int
) -> int:
    """指定 page 配下 block の送信済み予約を全て削除する。

    Page.date が変更されると配下の全 block の絶対日時が動くため、まとめて再通知させる。
    commit は呼ばない。
    """
    subquery = select(Block.id).where(Block.page_id == page_id)
    result = await db.execute(
        delete(SentNotification).where(SentNotification.block_id.in_(subquery))
    )
    return result.rowcount or 0


async def release_send_slot(
    db: AsyncSession, *, block_id: int, fcm_token: str, kind: str = _KIND_BEFORE
) -> None:
    """送信失敗時に予約を戻す (MVP は原則使わず、緊急リカバリ用)。"""
    await db.execute(
        delete(SentNotification).where(
            and_(
                SentNotification.block_id == block_id,
                SentNotification.fcm_token == fcm_token,
                SentNotification.kind == kind,
            )
        )
    )
    await db.commit()


@dataclass
class NotificationCandidate:
    """tick スキャンの 1 行 (block × subscription の結合結果)。"""

    block_id: int
    block_title: str
    block_type: str
    transportation_type: str | None
    start_time: datetime
    location_name: str | None
    destination_name: str | None
    fcm_token: str
    minutes_before: int
    timezone: str
    trip_id: int
    trip_url_id: str
    # 同一 page 内で next block の後に来る予定 (絶対 UTC + block_title)。
    # rolling next indicator (docs/notifications.md §5) 表示用。空なら省略。
    upcoming_blocks: list[tuple[datetime, str]]


def _compose_absolute_start(
    page_date: date, block_start_time: datetime, tz_name: str
) -> datetime | None:
    """Block の時刻部分 + Page.date + subscriber TZ → 絶対 UTC datetime。

    `Block.start_time` の年月日部分は無意味 (docs/notifications.md §3 参照)。
    ユーザが UI で入力したのは subscriber tz のローカル時刻なので、まず tz 変換してから
    .time() を取る必要がある (`.time()` を UTC のまま呼ぶと tz offset 分ズレる)。
    取り出した時刻を Page.date と組み合わせ、同 tz のローカル時刻として解釈して UTC に戻す。
    tz 名が不正なら None。
    """
    try:
        tz = ZoneInfo(tz_name)
    except ZoneInfoNotFoundError:
        return None
    time_in_tz = block_start_time.astimezone(tz).time()
    local = datetime.combine(page_date, time_in_tz, tzinfo=tz)
    return local.astimezone(UTC)


async def list_notification_candidates(db: AsyncSession) -> list[NotificationCandidate]:
    """通知送信すべき候補を返す。

    `Block.start_time` の年月日部分は無意味なため (docs/notifications.md §3)、
    実際の絶対日時は `Page.date + Block.start_time.time()` を subscriber の tz で
    解釈して得る。

    条件:
      - Trip.start_date IS NOT NULL (下書き旅程は除外)
      - Page.date IS NOT NULL (下書き Page は除外)
      - Page.date が [UTC 今日 - 1日, UTC 今日 + 1日] の範囲
      - 上記で組み立てた絶対日時が (now, now + minutes_before] の範囲
      - まだ 'before_5min' で送っていない
    """
    # DB 側で Page.date を [UTC 今日 - 1日, UTC 今日 + 1日] に絞る。
    # subscriber tz の "今日" は UTC "今日" と最大 1 日程度ずれ得る (例: 早朝 JST は前日 UTC)
    # ため広めに取り、細かい window 判定は Python 側で行う。
    now_utc = datetime.now(UTC)
    today_utc = now_utc.date()
    date_lower = today_utc - timedelta(days=1)
    date_upper = today_utc + timedelta(days=1)

    stmt = (
        select(
            Block.id.label("block_id"),
            Block.title.label("block_title"),
            Block.block_type.label("block_type"),
            Block.transportation_type.label("transportation_type"),
            Block.start_time.label("start_time"),
            Block.page_id.label("page_id"),
            Block.location_id,
            Block.destination_location_id,
            Page.date.label("page_date"),
            DeviceSubscription.fcm_token.label("fcm_token"),
            DeviceSubscription.minutes_before.label("minutes_before"),
            DeviceSubscription.timezone.label("timezone"),
            Trip.id.label("trip_id"),
            Trip.url_id.label("trip_url_id"),
        )
        .select_from(Block)
        .join(Page, Block.page_id == Page.id)
        .join(Trip, Page.trip_id == Trip.id)
        .join(DeviceSubscription, DeviceSubscription.trip_id == Trip.id)
        .outerjoin(
            SentNotification,
            and_(
                SentNotification.block_id == Block.id,
                SentNotification.fcm_token == DeviceSubscription.fcm_token,
                SentNotification.kind == _KIND_BEFORE,
            ),
        )
        .where(
            Trip.start_date.is_not(None),
            Page.date.is_not(None),
            Page.date >= date_lower,
            Page.date <= date_upper,
            SentNotification.block_id.is_(None),
        )
    )

    rows = (await db.execute(stmt)).mappings().all()
    if not rows:
        return []

    filtered: list[dict] = []
    for r in rows:
        absolute = _compose_absolute_start(r["page_date"], r["start_time"], r["timezone"])
        if absolute is None:
            continue
        threshold = now_utc + timedelta(minutes=r["minutes_before"])
        if absolute <= now_utc or absolute > threshold:
            continue
        filtered.append({**r, "absolute_start": absolute})

    if not filtered:
        return []

    location_ids: set[int] = set()
    for r in filtered:
        if r["location_id"] is not None:
            location_ids.add(r["location_id"])
        if r["destination_location_id"] is not None:
            location_ids.add(r["destination_location_id"])

    location_name_map: dict[int, str] = {}
    if location_ids:
        loc_rows = (
            await db.execute(
                select(Location.id, Location.name).where(Location.id.in_(location_ids))
            )
        ).all()
        location_name_map = {row.id: row.name for row in loc_rows}

    # 後続予定 (docs/notifications.md §5) を組み立てるため、候補が属する page 内の
    # 全 block を 1 クエリでまとめて取得し、Python 側で candidate 毎に絞り込む。
    # N+1 を避けつつ実装は素朴に保つ (candidate は現実的に少数のため)。
    page_ids = {r["page_id"] for r in filtered}
    page_blocks_map: dict[int, list[tuple[int, datetime, str]]] = {}
    if page_ids:
        pb_rows = (
            await db.execute(
                select(Block.id, Block.page_id, Block.start_time, Block.title).where(
                    Block.page_id.in_(page_ids)
                )
            )
        ).all()
        for row in pb_rows:
            page_blocks_map.setdefault(row.page_id, []).append(
                (row.id, row.start_time, row.title)
            )

    # rolling next tag (trip-{tripId}) は同一 trip の旧通知を置換するため、
    # A (01:00) より先に B (01:02) の通知を送ると A の 5 分前通知が start 前に
    # 消される。同 page 内に candidate より早い upcoming block が未 start なら、
    # candidate の送信を後 tick に延期する (docs/notifications.md §5b)。
    # A が start すれば次 tick で earliest 判定から抜け、B が新たな next として送信される。
    filtered = [
        r
        for r in filtered
        if not _has_earlier_upcoming_in_same_page(
            page_blocks=page_blocks_map.get(r["page_id"], []),
            page_date=r["page_date"],
            tz_name=r["timezone"],
            candidate_block_id=r["block_id"],
            candidate_absolute_start=r["absolute_start"],
            now_utc=now_utc,
        )
    ]

    if not filtered:
        return []

    return [
        NotificationCandidate(
            block_id=r["block_id"],
            block_title=r["block_title"],
            block_type=r["block_type"],
            transportation_type=r["transportation_type"],
            start_time=r["absolute_start"],
            location_name=(
                location_name_map.get(r["location_id"]) if r["location_id"] else None
            ),
            destination_name=(
                location_name_map.get(r["destination_location_id"])
                if r["destination_location_id"]
                else None
            ),
            fcm_token=r["fcm_token"],
            minutes_before=r["minutes_before"],
            timezone=r["timezone"],
            trip_id=r["trip_id"],
            trip_url_id=r["trip_url_id"],
            upcoming_blocks=_collect_upcoming_blocks(
                page_blocks=page_blocks_map.get(r["page_id"], []),
                current_block_id=r["block_id"],
                page_date=r["page_date"],
                tz_name=r["timezone"],
                after_utc=r["absolute_start"],
            ),
        )
        for r in filtered
    ]


def _has_earlier_upcoming_in_same_page(
    *,
    page_blocks: list[tuple[int, datetime, str]],
    page_date: date,
    tz_name: str,
    candidate_block_id: int,
    candidate_absolute_start: datetime,
    now_utc: datetime,
) -> bool:
    """same-page 内に「now より未来かつ candidate より前」の block が存在するかを返す。

    True なら candidate は「earlier upcoming」を持つため、rolling next tag の上書きで
    先行通知が消えることを防ぐために candidate の送信を後 tick に延期すべき。

    - candidate 自身は除外
    - tz が不正な block は skip
    - 同一時刻 (`b_abs == candidate_absolute_start`) は「earlier」に含めない (同時刻の
      複数 block は上書き競合するが、現状の設計では受容 = 最後着が残る)
    """
    for bid, start_time, _title in page_blocks:
        if bid == candidate_block_id:
            continue
        b_abs = _compose_absolute_start(page_date, start_time, tz_name)
        if b_abs is None:
            continue
        if now_utc < b_abs < candidate_absolute_start:
            return True
    return False


def _collect_upcoming_blocks(
    *,
    page_blocks: list[tuple[int, datetime, str]],
    current_block_id: int,
    page_date: date,
    tz_name: str,
    after_utc: datetime,
) -> list[tuple[datetime, str]]:
    """same-page 内で candidate の絶対時刻より後 (or 同時刻の他 block) を絶対時刻順で上位 N 件返す。

    - current_block_id は除外 (自身)
    - Block.start_time の time-of-day のみ使い、Page.date + subscriber tz で絶対時刻化する
      (docs/notifications.md §3 の不変条件)
    - tz が不正な block は skip (candidate 自体が tz 検証済で残っている前提)
    - **同時刻の他 block は含める**: end_time null と duration あり block 等で同一 start_time
      は実運用で発生する。同時刻 A/B は同一 tag で片方だけが表示されるが、勝者側の body に
      他方が upcoming として現れることで情報損失を防ぐ (docs/notifications.md §5b)。
    - 深夜またぎ block (Page.date=X で time=03:00 等) は「X 日の 03:00」として扱われるため、
      絶対時刻順で見ると 22:00 の前に来ることがある。既存の Block.start_time モデルの
      挙動に従うのみ (docs/notifications.md §5 参照)。
    """
    upcoming: list[tuple[datetime, str]] = []
    for block_id, start_time, title in page_blocks:
        if block_id == current_block_id:
            continue
        absolute = _compose_absolute_start(page_date, start_time, tz_name)
        if absolute is None or absolute < after_utc:
            continue
        upcoming.append((absolute, title))
    upcoming.sort(key=lambda item: item[0])
    return upcoming[:_MAX_UPCOMING_BLOCKS]
