FROM python:3.13-slim AS builder
WORKDIR /app
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

FROM python:3.13-slim
WORKDIR /app
COPY --from=builder /app/.venv /app/.venv
COPY . .
ENV PATH="/app/.venv/bin:$PATH"
EXPOSE 8080
CMD ["sh", "-c", "exec gunicorn -w \"${WEB_CONCURRENCY:-1}\" -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:8080"]
