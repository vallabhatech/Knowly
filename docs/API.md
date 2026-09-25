# Knowly API Reference

Base URL during local development: http://localhost:8000

Interactive Swagger documentation is available at /docs and the machine-readable OpenAPI contract is available at /openapi.json.

## Health

### GET /health

Returns service availability.

Response:

~~~json
{"status":"ok"}
~~~

## Session identity

### GET /api/whoami

Creates or resolves the anonymous session and returns its server-side user identifier.

The browser receives the signed sg_uid cookie on first use.

## Authentication

Routes are grouped below /api/auth.

Typical operations include current authentication state, Google OAuth start/callback and logout.

## Document processing

### POST /api/process

Accepts multipart form data.

Inputs:

- file: source PDF
- title: optional document title

Returns the generated document ID, study guide and quiz.

The fixture-backed development path makes this flow testable without a live AI request.

## Documents

Routes are grouped under /api/documents.

### GET /api/documents

Lists documents belonging to the current session/user.

### GET /api/documents/{document_id}

Returns one owned document with its learning content.

### PATCH /api/documents/{document_id}

Updates supported document metadata such as title.

### DELETE /api/documents/{document_id}

Soft-deletes an owned document.

### GET /api/documents/{document_id}/download

Returns a time-limited signed URL for an owned source document.

## Quiz attempts

Routes are grouped under /api/attempts.

The attempt API handles answer submission, payload validation, persistence and retrieval of attempt details.

## Sage chat

### POST /api/chat

Accepts a conversation plus optional study context and returns a tutor reply.

Optional context can contain document title, source information, summary and concepts.

## Error contract

Application errors use a consistent shape:

~~~json
{
  "detail": "Human-readable message",
  "code": "machine_readable_code"
}
~~~

Common categories include invalid_request, rate_limited, upstream_invalid, HTTP-derived errors and internal_error.

## API type generation

The frontend contract is generated from the running FastAPI OpenAPI document:

~~~bat
cd client
npm run gen:api
~~~

The generated file is client/src/lib/api-types.ts.

## Authorization rule

Document-scoped operations resolve the current identity server-side and check ownership before returning or mutating data.
