from typing import Any

from fastapi import Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel


class ErrorResponse(BaseModel):
    """
    エラーレスポンスのモデル

    API からクライアントへ返却するエラー情報を表します。

    Attributes:
      message (str): 人間が読めるエラーメッセージ。UI/ログ表示向けの簡潔な説明。
      code (str): アプリケーション／ドメイン固有のエラーコード。機械可読な識別子（例: "AUTH_001"）。
      detail (dict[str, Any] | list[dict[str, Any]] | None): 追加のエラー詳細。
        単一の辞書、または複数エラーの辞書リストを許容。追加情報がない場合は None。
        例: {"field": "email", "message": "無効な形式"} や
          [{"field": "password", "message": "必須です"}]

    Examples:
      # 単一の詳細
      {"message": "入力値が不正です", "code": "VALIDATION_ERROR",
       "detail": {"field": "email", "message": "無効な形式"}}

      # 複数の詳細
      {"message": "入力値が不正です", "code": "VALIDATION_ERROR",
       "detail": [
         {"field": "email", "message": "無効な形式"},
         {"field": "password", "message": "必須です"}
       ]}
    """

    message: str
    code: str
    detail: dict[str, Any] | list[dict[str, Any]] | None


class ErrorResponseException(Exception):
    """
    エラーレスポンスを返すためのカスタム例外クラス

    Attributes:
      response (ErrorResponse): エラーレスポンスの内容
    """

    response_status: int = status.HTTP_500_INTERNAL_SERVER_ERROR

    def __init__(
        self,
        message: str,
        code: str,
        detail: dict[str, Any] | None = None,
        description: str = "",
    ):
        self.message = message
        self.code = code
        self.detail = detail
        self.description = description

    def response(self) -> ErrorResponse:
        """
        エラーレスポンスを生成するメソッド

        Returns:
            ErrorResponse: エラーレスポンスのインスタンス
        """
        return ErrorResponse(
            message=self.message,
            code=self.code,
            detail=self.detail,
        )


class InvalidParam(ErrorResponseException):
    """
    無効なパラメータに対するエラー

    Attributes:
      response_status (int): HTTP ステータスコード
    """

    response_status = status.HTTP_400_BAD_REQUEST

    def __init__(
        self,
        message: str,
        code: str = "invalid_param",
        detail: dict[str, Any] | None = None,
        description: str = "",
    ):
        self.message = message
        self.code = code
        self.detail = detail
        self.description = description


async def error_response_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    """
    エラーレスポンスを生成するハンドラー

    Args:
        request (Request): リクエストオブジェクト
        exc (ErrorResponseException): 発生した例外

    Returns:
        JSONResponse: エラーレスポンス
    """

    # isinstanceで型をチェックし、mypyにexcがErrorResponseExceptionであることを伝える
    if not isinstance(exc, ErrorResponseException):
        raise exc

    return JSONResponse(
        status_code=exc.response_status,
        content=jsonable_encoder(exc.response()),
    )


async def validation_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    """
    PydanticのValidation Errorの内容から必要な情報を抽出し、JSON形式で返すハンドラー

    Args:
        request (Request): リクエストオブジェクト
        exc (RequestValidationError): バリデーションエラー

    Returns:
        JSONResponse: エラーレスポンス
    """

    # isinstanceで型をチェックし、mypyにexcがErrorResponseExceptionであることを教える
    if not isinstance(exc, RequestValidationError):
        raise exc
    try:
        detail = [
            {
                "type": e.get("type"),
                "loc": e.get("loc"),
                "input": e.get("input"),
                "msg": e.get("msg"),
            }
            for e in exc.errors()
        ]
    except Exception:
        detail = None

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=jsonable_encoder(
            {
                "message": "Validation failed",
                "code": "validation_error",
                "detail": detail,
            },
        ),
    )
