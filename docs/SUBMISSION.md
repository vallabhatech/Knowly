# Submission Guide

## Project summary

Knowly is an AI-assisted learning workspace that transforms uploaded study material into structured study guides and quizzes, stores reusable learning content and provides an interactive tutor for follow-up questions.

## Problem

Students often have fragmented notes and PDFs but still need to manually create concise revision material, important concepts, practice questions and answer explanations.

## Solution

Knowly puts capture, understanding, practice and review into one workflow. A student uploads source material and receives a reusable learning pack that can be studied, tested and discussed.

## Demonstration path

1. Open the web client.
2. Upload a study PDF.
3. Show the generated study guide.
4. Open the quiz.
5. Answer several questions.
6. Submit the attempt.
7. Show the results/review screen.
8. Open the library and show persistence.
9. Ask Sage a question about the material.

When external AI credentials are unavailable, use the deterministic fixture-backed development/test path.

## Technical highlights

- React + TypeScript frontend
- FastAPI backend
- PostgreSQL persistence
- Alembic migrations
- PDF extraction pipeline
- Structured AI output validation
- Anonymous signed sessions
- Optional Google OAuth
- Object-storage abstraction
- Contextual tutor endpoint
- Automated backend regression tests
- Dockerized local deployment
- OpenAPI-generated frontend types

## Verification

Run:

~~~bat
cd server
pytest
ruff check .
mypy app
~~~

Then:

~~~bat
cd client
npm run lint
npx tsc -b
npm run build
~~~

Verify the user journey:

- API health
- PDF upload
- study guide generation
- quiz generation
- attempt submission
- results rendering
- document library
- ownership isolation
- Sage chat when configured
- Docker startup

Only report checks as passed after actually executing them.

## Submission assets

Prepare:

1. Concise project description.
2. Architecture diagram.
3. Product screenshots.
4. Short demo video if required.
5. Repository link.
6. Setup instructions without secrets.
7. Test and verification results.

## Evaluator narrative

Knowly demonstrates an end-to-end learning workflow rather than an isolated AI generation call: source material enters through a capture flow, becomes structured learning content, is persisted as a reusable workspace, is evaluated through quizzes and can be extended through contextual tutor interaction.

## Integration dependencies

Full functionality can depend on Gemini, Google OAuth, S3-compatible storage and PostgreSQL. The repository includes local/test mechanisms so core behavior can be evaluated without every external integration.

## Final release checklist

- [ ] Repository link works
- [ ] README is current
- [ ] Architecture and API docs are current
- [ ] No secrets are committed
- [ ] Migrations are reproducible
- [ ] Tests pass
- [ ] Backend lint/type checks pass
- [ ] Frontend lint/type checks/build pass
- [ ] Demo path works
- [ ] Screenshots are current
- [ ] Submission description matches implementation
