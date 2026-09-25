# Knowly Architecture

## System boundary

Knowly is a two-tier application:

1. React/Vite browser client.
2. FastAPI service backed by PostgreSQL and configurable object storage.

The service owns document processing, persistence, authentication, quiz attempts and AI-facing operations. The browser owns presentation, navigation, local quiz state and API caching.

## Document processing lifecycle

1. Client sends multipart data to POST /api/process.
2. API resolves the caller identity from the signed session.
3. Source document is validated and persisted through the storage service.
4. PDF text is extracted.
5. AI generation or the deterministic fixture path produces structured learning content.
6. Pydantic schemas validate the generated result.
7. Document, guide and quiz records are persisted.
8. Structured response is returned to the browser.
9. Client cache is updated.

## Review lifecycle

1. User opens a generated quiz.
2. Answers are maintained in client state.
3. Client submits the attempt to /api/attempts.
4. API validates the answer payload and ownership.
5. Attempt is persisted.
6. Results can be retrieved for review.

## Tutor lifecycle

1. Client sends messages and optional study context to /api/chat.
2. API validates the request.
3. Sage receives the contextual prompt.
4. Service returns a tutor response.
5. Client renders the response.

## Backend organization

- app/core: configuration, errors, logging and shared infrastructure
- app/models: database entities
- app/schemas: API contracts
- app/routers: HTTP boundary and authorization
- app/services: PDF, AI, storage and domain services
- app/jobs: scheduled maintenance
- migrations: schema evolution

## Frontend organization

- components: reusable UI
- routes: screen-level workflows
- lib/api.ts: HTTP access
- lib/queries.ts: query hooks and cache invalidation
- lib/api-types.ts: generated OpenAPI types
- lib/docAdapter.ts: API-to-UI conversion
- store: client-only state

## Persistence and authorization

PostgreSQL stores structured application state. Uploaded source files use configurable object storage.

Document operations are scoped to the server-resolved user/session identity. A document ID by itself is never treated as an authorization credential.

## Authentication

Anonymous users receive a signed sg_uid cookie. Authenticated Google users receive an authenticated session.

## Error handling

The API normalizes application failures into responses containing detail and code fields. Dedicated handlers cover validation failures, upstream AI rate limits, storage failures, application errors, HTTP errors and unexpected exceptions.

## Scheduled maintenance

The FastAPI lifespan starts an APScheduler orphan-cleanup job. DISABLE_SCHEDULER=1 can disable it for controlled environments.

## Design principles

- Keep browser state separate from durable server state.
- Keep API contracts explicit through Pydantic and OpenAPI.
- Keep AI and storage integrations behind service boundaries.
- Scope persisted content by server-resolved identity.
- Prefer deterministic fixtures for automated tests.
- Make database migrations explicit and repeatable.
