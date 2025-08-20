from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from app.errors import ErrorResponseException, error_response_exception_handler, validation_exception_handler

from .routers import example, users

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(example.router, prefix="/api/example", tags=["example"])
app.include_router(users.router, prefix="/api/users", tags=["users"])

app.add_exception_handler(ErrorResponseException, error_response_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
