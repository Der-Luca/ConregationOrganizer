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
    slowapi

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
