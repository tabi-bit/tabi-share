from typing import Annotated

import fastapi
import pytest
from app.errors import (
    InvalidParam,
    error_response_exception_handler,
    validation_exception_handler,
)
from fastapi.exceptions import RequestValidationError
from fastapi.testclient import TestClient
from pydantic import AfterValidator


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "kwargs, expected",
    [
        (
            {
                "message": "test_message",
                "code": "test_code",
                "detail": {"test": "test"},
            },
            {
                "message": "test_message",
                "code": "test_code",
                "detail": {"test": "test"},
            },
        ),
        (
            {
                "message": "test_message",
                "detail": {"test": "test"},
            },
            {
                "message": "test_message",
                "code": "invalid_param",
                "detail": {"test": "test"},
            },
        ),
        (
            {
                "message": "test_message",
                "code": "test_code",
            },
            {
                "message": "test_message",
                "code": "test_code",
                "detail": None,
            },
        ),
    ],
)
async def test_invalid_param_exception_hanlder(kwargs, expected):
    """InvalidParamが発生した場合に期待通りのレスポンスが返却されることを確認する"""
    # arrange
    app = fastapi.FastAPI()

    app.add_exception_handler(InvalidParam, error_response_exception_handler)

    @app.get("/invalid_param")
    async def get():
        raise InvalidParam(**kwargs)

    # act
    with TestClient(app) as client:
        res = client.get("/invalid_param")

    # assert
    assert res.status_code == 400
    assert res.json() == expected


def test_validation_exception_handler():
    """RequestValidationErrorが発生した場合に期待通りのレスポンスが返却されることを確認する"""
    # arrange
    app = fastapi.FastAPI()

    app.add_exception_handler(RequestValidationError, validation_exception_handler)

    def validate_positive_int(value: int) -> int:
        if value <= 0:
            raise ValueError("Input should be a positive integer")

        return value

    @app.get("/validation_error")
    async def get(
        required_param: Annotated[
            int, fastapi.Query(...), AfterValidator(validate_positive_int)
        ],
    ):
        return {"status": "no validation errors"}

    # act
    # 必須クエリパラメータが不足している場合
    with TestClient(app) as client:
        res = client.get("/validation_error")

    # assert
    assert res.status_code == 422
    print(res.json())
    print(
        {
            "message": "Validation failed",
            "code": "validation_error",
            "detail": [
                {
                    "type": "missing",
                    "loc": ["quety", "required_param"],
                    "input": None,
                    "msg": "Field required",
                }
            ],
        }
    )
    assert res.json() == {
        "message": "Validation failed",
        "code": "validation_error",
        "detail": [
            {
                "type": "missing",
                "loc": ["query", "required_param"],
                "input": None,
                "msg": "Field required",
            }
        ],
    }

    # act
    # クエリパラメータの型が不正な場合
    with TestClient(app) as client:
        res = client.get("/validation_error?required_param=0")

    # assert
    assert res.status_code == 422
    assert res.json() == {
        "message": "Validation failed",
        "code": "validation_error",
        "detail": [
            {
                "type": "value_error",
                "loc": ["query", "required_param"],
                "input": "0",
                "msg": "Value error, Input should be a positive integer",
            }
        ],
    }
