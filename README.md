# Knowly

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


## Project overview

Knowly turns uploaded study material into a structured learning workspace: students can capture a PDF, generate a study guide and quiz, save the result in a personal library, review attempts, and ask Sage for contextual help.

### Core workflow

~~~text
Capture → Extract → Understand → Practice → Review → Ask
~~~

### Main capabilities

- PDF upload and text extraction
- Structured study-guide generation
- Quiz generation with explanations
- Quiz attempt submission and review
- Session-scoped document library
- Sage contextual tutor chat
- Anonymous signed sessions
- Optional Google OAuth authentication
- PostgreSQL persistence
- S3-compatible source-document storage
- OpenAPI-generated TypeScript API types
- Fixture-backed development/testing path that does not require a live AI key

## Architecture at a glance

~~~text
React + TypeScript + Vite
          │
          │ HTTP / JSON / multipart
          ▼
       FastAPI
    ┌─────┼──────────┐
    ▼     ▼          ▼
Documents Attempts   Auth / Chat
    │     │          │
    └─────┴──────┬───┘
                 ▼
            PostgreSQL
                 │
          ┌──────┴──────┐
          ▼             ▼
    Object Storage    Gemini / AI
~~~

Detailed design: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Technology stack

| Area | Technology |
|---|---|
| Client | React 18, TypeScript, Vite |
| Client data | TanStack Query |
| Client state | Zustand |
| Backend | FastAPI, Python 3.12+ |
| Database | PostgreSQL 16 |
| ORM | SQLModel / SQLAlchemy |
| Migrations | Alembic |
| AI | Google Gemini via google-genai |
| PDF | pypdf + PyMuPDF |
| Storage | S3-compatible storage via aioboto3 |
| Auth | Signed anonymous sessions + Google OAuth |
| Testing | pytest + pytest-asyncio |
| Containers | Docker Compose |

## Repository map

~~~text
client/                  React application
server/app/core/        configuration, errors, logging
server/app/models/      database models
server/app/routers/     HTTP routes
server/app/schemas/     request/response contracts
server/app/services/    AI, PDF, storage and domain services
server/tests/           backend tests and fixtures
docs/                    submission and engineering documentation
~~~

## Windows setup

### Prerequisites

Install Git, Python 3.12+, Node.js 20+, npm, and either PostgreSQL 16+ or Docker Desktop.

### Start PostgreSQL with Docker

~~~bat
docker run -d --name knowly-postgres ^
  -e POSTGRES_PASSWORD=postgres ^
  -e POSTGRES_DB=snapstudy ^
  -p 5432:5432 postgres:16
~~~

### Start the API

~~~bat
cd server
python -m venv .venv
.venv\\Scripts\\activate
pip install -e ".[dev]"
copy .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --port 8000
~~~

API resources: http://localhost:8000/docs, http://localhost:8000/openapi.json and http://localhost:8000/health

### Start the client

~~~bat
cd client
npm install
npm run gen:api
npm run dev
~~~

Open http://localhost:5173.

## Testing and quality gates

The backend test suite covers health, signed session cookies, processing, fixture-backed AI output, persistence, duplicate uploads, signed download URLs, ownership isolation, soft deletion, rate limits, validation failures, authentication, storage and database behavior.

~~~bat
cd server
pytest
ruff check .
mypy app
~~~

Client checks:

~~~bat
cd client
npm run lint
npx tsc -b
npm run build
~~~

A new submission should not be described as verified until these checks have actually been run in the target environment.

## API contract generation

The frontend types are generated from the running FastAPI OpenAPI document:

~~~bat
cd client
npm run gen:api
~~~

The generated contract is client/src/lib/api-types.ts. Restart the API after response-model changes before regenerating it.

Endpoint reference: [docs/API.md](docs/API.md)

## Docker verification

~~~bat
docker compose up --build
~~~

The production-like local stack exposes the client on port 8080 and the API on port 8000. The development compose override provides hot reload.

~~~bat
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
docker compose down
~~~

## Configuration

Use server/.env.example as the source of truth for local configuration. Important variables include DATABASE_URL, GEMINI_API_KEY, STORAGE_BUCKET, STORAGE_ENDPOINT, STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY, COOKIE_SECRET, GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, OAUTH_REDIRECT_URL, SESSION_SECRET, CORS_ORIGINS and ENV.

Never commit real credentials.

## Security notes

Knowly uses signed session identifiers, HTTP-only/same-site cookie protections, user-scoped document queries, ownership checks, soft deletion, environment-based secrets, CORS controls and structured API errors. Upstream AI rate-limit handling is also implemented.

For production use, add TLS, managed secrets, restricted CORS, hardened cookie settings, backups, observability and infrastructure-level access controls.

## Submission checklist

- [ ] README and docs reviewed
- [ ] No secrets committed
- [ ] Migrations apply cleanly
- [ ] Backend tests pass
- [ ] Ruff and mypy pass
- [ ] Client lint/typecheck/build pass
- [ ] Upload → study guide → quiz flow verified
- [ ] Library and ownership behavior verified
- [ ] Quiz attempt/results flow verified
- [ ] Sage verified when AI credentials are available
- [ ] Docker smoke test completed
- [ ] Screenshots/demo assets prepared

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API reference](docs/API.md)
- [Development and troubleshooting](docs/DEVELOPMENT.md)
- [Submission guide](docs/SUBMISSION.md)
- [Original product requirements](PRP.md)
