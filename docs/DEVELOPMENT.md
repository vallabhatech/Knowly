# Development Guide

## Environment

Recommended versions:

- Python 3.12+
- Node.js 20+
- PostgreSQL 16+
- Docker Desktop on Windows

## Backend setup

~~~bat
cd server
python -m venv .venv
.venv\\Scripts\\activate
pip install -e ".[dev]"
copy .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --port 8000
~~~

## Frontend setup

~~~bat
cd client
npm install
npm run gen:api
npm run dev
~~~

## Development loop

When changing backend schemas or response models:

1. Update the schema.
2. Update router/service behavior.
3. Add or update a regression test.
4. Restart FastAPI.
5. Regenerate client types.
6. Run backend checks.
7. Run frontend typecheck/build.
8. Smoke-test the affected flow.

## Test suite

~~~bat
cd server
pytest
~~~

Focused runs:

~~~bat
pytest tests/test_health.py
pytest tests/test_user_cookie.py
pytest tests/test_process_pipeline.py
~~~

External AI and storage boundaries are mocked where practical so tests remain deterministic.

## Static checks

~~~bat
cd server
ruff check .
mypy app
pytest
~~~

Client:

~~~bat
cd client
npm run lint
npx tsc -b
npm run build
~~~

## Database migrations

Create a migration after a model change:

~~~bat
cd server
alembic revision --autogenerate -m "describe schema change"
alembic upgrade head
~~~

Do not rewrite an already-applied shared migration.

## Troubleshooting

### PostgreSQL connection failure

Check that PostgreSQL is running and DATABASE_URL points to the correct host and port.

### Client cannot reach the API

Confirm FastAPI is listening on port 8000 and Vite is running on port 5173.

### Generated API types are stale

Restart FastAPI and run npm run gen:api again.

### AI calls fail

Check GEMINI_API_KEY. Use the fixture-backed path for deterministic local testing when external credentials are unavailable.

### OAuth callback fails

Verify the Google Cloud redirect URI exactly matches OAUTH_REDIRECT_URL.

### Docker problems

~~~bat
docker compose ps
docker compose logs -f server
docker compose logs -f client
~~~

## Safe change checklist

Before committing a feature:

- Add a regression test.
- Do not leak secrets into logs or source.
- Preserve ownership checks.
- Update API schemas when behavior changes.
- Regenerate client types after contract changes.
- Run lint, typecheck and tests.
