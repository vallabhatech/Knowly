# SnapStudy / PocketGuru

Photo-to-study-guide-and-quiz app. See `PRP.md` for the full spec.

## Layout

- `server/` — FastAPI + SQLAlchemy + Alembic
- `client/` — React + Vite + TypeScript + TanStack Query

## Run locally

You'll need two terminals: one for the API, one for the web client.

### 1. Postgres

The server expects Postgres at `localhost:5432` with database `snapstudy`. The
default `DATABASE_URL` (in `server/.env.example`) is
`postgresql+asyncpg://postgres:postgres@localhost:5432/snapstudy`.

Quickest path is Docker:

```
docker run -d --name pg-snapstudy \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=snapstudy \
  -p 5432:5432 postgres:16
```

(Or use the full Docker workflow in the next section to skip the local install.)

### 2. Server (FastAPI on :8000)

```
cd server
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env             # fill secrets if needed
alembic upgrade head             # apply migrations
uvicorn app.main:app --reload --port 8000
```

- Swagger UI: http://localhost:8000/docs
- Health check: `curl http://localhost:8000/health`
- The `POST /api/process` route currently loads a fixture (Photosynthesis study
  guide) — no Gemini key required to exercise the full flow.

> If you've changed any route's `response_model` or schema, fully restart
> uvicorn before regenerating client types — `--reload` doesn't always rebuild
> the OpenAPI schema.

### 3. Client (Vite on :5173)

```
cd client
npm install
npm run gen:api                  # regenerates src/lib/api-types.ts (server must be up)
npm run dev
```

Open http://localhost:5173. Vite proxies `/api/*` and `/health` to the server.
First request sets a signed `sg_uid` cookie that scopes all documents to your
session.

### Google sign-in

Phase 13 adds server-side Google OAuth and an authenticated session cookie.
Anonymous sessions still use `sg_uid`; signing in merges that anonymous library
into the Google account and sets `sg_session`.

Create an OAuth client in Google Cloud Console with:

- Authorized JavaScript origin: `http://localhost:5173`
- Authorized redirect URI: `http://localhost:8000/api/auth/callback/google`

Set these in `server/.env` and the root `.env` used by Docker Compose:

```
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
OAUTH_REDIRECT_URL=http://localhost:8000/api/auth/callback/google
SESSION_SECRET=... # at least 32 random bytes
```

### 4. Smoke test the full loop

```
# from anywhere, with both servers running:
echo "fake pdf" > /tmp/fake.pdf
curl -c /tmp/c.txt -b /tmp/c.txt -X POST \
  -F "file=@/tmp/fake.pdf" -F "title=My First Doc" \
  http://localhost:5173/api/process

curl -b /tmp/c.txt http://localhost:5173/api/documents
```

The new doc should appear under "Pick up where you left off" on the home page
when you visit http://localhost:5173/ with the same browser session.

### Useful scripts

```
# server
cd server && pytest                     # run test suite
alembic revision --autogenerate -m "…"  # create a new migration

# client
cd client && npm run gen:api            # regenerate typed API surface
cd client && npx tsc -b                 # typecheck
cd client && npm run build              # production build
```

## Docker (recommended for pre-deployment testing)

```
docker compose logs -f server

cp server/.env.example .env       # fill GEMINI_API_KEY, COOKIE_SECRET, STORAGE_*

# Production-like: Nginx + Gunicorn + Postgres
docker compose up --build
# → client http://localhost:8080  · server http://localhost:8000/docs

# Hot-reload dev: Vite + Uvicorn --reload, source mounted
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
# → client http://localhost:5173  · server http://localhost:8000

docker compose down -v            # tear down + wipe volumes
```

Migrations run automatically on each `server` container boot.
