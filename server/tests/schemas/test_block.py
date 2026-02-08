from datetime import datetime, timezone
from app.schemas.block import BlockCreate, BlockType

def test_timezone_naive_input():
    # Naive string: 2023-01-01T10:00:00
    data = {
        "title": "Naive",
        "start_time": "2023-01-01T10:00:00",
        "end_time": "2023-01-01T12:00:00",
        "detail": "detail",
        "block_type": "event",
    }
    block = BlockCreate(**data)
    assert block.start_time.tzinfo is None
    assert block.start_time == datetime(2023, 1, 1, 10, 0, 0)
    assert block.end_time.tzinfo is None
    assert block.end_time == datetime(2023, 1, 1, 12, 0, 0)

def test_timezone_aware_utc_input():
    # Aware UTC string: 2023-01-01T10:00:00Z
    data = {
        "title": "Aware UTC",
        "start_time": "2023-01-01T10:00:00Z",
        "end_time": "2023-01-01T12:00:00Z",
        "detail": "detail",
        "block_type": "event",
    }
    block = BlockCreate(**data)
    # Pydantic parses Z as UTC aware. The validator should convert to naive UTC.
    assert block.start_time.tzinfo is None
    assert block.start_time == datetime(2023, 1, 1, 10, 0, 0)
    assert block.end_time.tzinfo is None
    assert block.end_time == datetime(2023, 1, 1, 12, 0, 0)

def test_timezone_aware_offset_input():
    # Aware Offset string: 2023-01-01T19:00:00+09:00 (JST) -> 10:00 UTC
    data = {
        "title": "Aware Offset",
        "start_time": "2023-01-01T19:00:00+09:00",
        "end_time": "2023-01-01T21:00:00+09:00",
        "detail": "detail",
        "block_type": "event",
    }
    block = BlockCreate(**data)
    # The validator should convert to UTC and make naive.
    assert block.start_time.tzinfo is None
    assert block.start_time == datetime(2023, 1, 1, 10, 0, 0)
    assert block.end_time.tzinfo is None
    assert block.end_time == datetime(2023, 1, 1, 12, 0, 0)

def test_optional_end_time():
    data = {
        "title": "Optional End Time",
        "start_time": "2023-01-01T10:00:00Z",
        "detail": "detail",
        "block_type": "event",
    }
    block = BlockCreate(**data)
    assert block.end_time is None
