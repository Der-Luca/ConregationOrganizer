FROM python:3.12-slim

WORKDIR /app

RUN pip install --no-cache-dir \
    fastapi \
    "uvicorn[standard]" \
    sqlalchemy \
    psycopg2-binary \
    "python-jose[cryptography]" \
    "passlib[bcrypt]" \
    pydantic-settings \
    alembic \
    python-multipart \
    "pydantic[email]" \
    slowapi \
    pillow

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--timeout-keep-alive", "300", "--h11-max-incomplete-event-size", "0"]
