import io
from uuid import UUID, uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.schemas.quiz import StudyGuideAndQuiz
from app.services.fixture_loader import load_fixture
from app.services.gemini import GeminiRateLimit


def _study_result() -> StudyGuideAndQuiz:
    fixture = load_fixture()
    payload = {
        "study_guide": fixture["study_guide"],
        "quiz": {
            "questions": [
                {**question, "id": str(uuid4())}
                for question in fixture["quiz"]["questions"]
            ]
        },
    }
    return StudyGuideAndQuiz.model_validate(payload)


def _fake_pdf_bytes() -> bytes:
    return b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n1 0 obj<<>>endobj\nxref\n0 1\n0000000000 65535 f\ntrailer<<>>\n%%EOF"


@pytest.fixture(autouse=True)
def mock_phase5_services(monkeypatch: pytest.MonkeyPatch) -> None:
    async def extract_text(_path):
        return "Photosynthesis notes extracted from this uploaded PDF."

    async def generate(_text):
        return _study_result()

    async def put(user_id, document_id, _source):
        return f"docs/{user_id}/{document_id}.pdf"

    monkeypatch.setattr("app.routers.process.pdf.extract_text", extract_text)
    monkeypatch.setattr("app.routers.process.gemini.generate", generate)
    monkeypatch.setattr("app.routers.process.storage.put", put)


@pytest.mark.asyncio
async def test_process_returns_response_and_persists_document() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {"file": ("notes.pdf", io.BytesIO(_fake_pdf_bytes()), "application/pdf")}
        data = {"title": "My Test Doc"}
        resp = await client.post("/api/process", files=files, data=data)
        assert resp.status_code == 200, resp.text

        body = resp.json()
        document_id = UUID(body["document_id"])
        assert body["study_guide"]["title"]
        assert body["study_guide"]["summary"]
        assert len(body["quiz"]["questions"]) == 10
        for q in body["quiz"]["questions"]:
            UUID(q["id"])
            assert len(q["options"]) == 4
            assert 0 <= q["correct_index"] <= 3

        listing = await client.get("/api/documents")
        assert listing.status_code == 200
        ids = [item["id"] for item in listing.json()["items"]]
        assert str(document_id) in ids

        detail = await client.get(f"/api/documents/{document_id}")
        assert detail.status_code == 200
        assert detail.json()["document_id"] == str(document_id)


@pytest.mark.asyncio
async def test_process_reupload_returns_cached_document(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls = 0

    async def generate(_text):
        nonlocal calls
        calls += 1
        return _study_result()

    monkeypatch.setattr("app.routers.process.gemini.generate", generate)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        first_files = {"file": ("notes.pdf", io.BytesIO(_fake_pdf_bytes()), "application/pdf")}
        first = await client.post("/api/process", files=first_files)
        assert first.status_code == 200, first.text

        second_files = {"file": ("notes.pdf", io.BytesIO(_fake_pdf_bytes()), "application/pdf")}
        second = await client.post("/api/process", files=second_files)
        assert second.status_code == 200, second.text

    assert second.json()["document_id"] == first.json()["document_id"]
    assert calls == 1


@pytest.mark.asyncio
async def test_download_returns_signed_url_for_owner(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    signed_calls: list[tuple[str, int]] = []

    async def signed_url(storage_key, expires_in=600):
        signed_calls.append((storage_key, expires_in))
        return f"https://storage.test/{storage_key}?signed=1"

    monkeypatch.setattr("app.routers.documents.storage.signed_url", signed_url)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {"file": ("notes.pdf", io.BytesIO(_fake_pdf_bytes()), "application/pdf")}
        processed = await client.post("/api/process", files=files)
        assert processed.status_code == 200, processed.text

        document_id = processed.json()["document_id"]
        downloaded = await client.get(f"/api/documents/{document_id}/download")

    assert downloaded.status_code == 200, downloaded.text
    body = downloaded.json()
    assert body["url"].startswith("https://storage.test/docs/")
    assert body["url"].endswith(f"/{document_id}.pdf?signed=1")
    assert body["expires_in"] == 300
    signed_key = body["url"].removeprefix("https://storage.test/").removesuffix("?signed=1")
    assert signed_calls == [(signed_key, 300)]


@pytest.mark.asyncio
async def test_process_gemini_rate_limit_returns_429(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def rate_limited(_text):
        raise GeminiRateLimit(retry_after=17)

    monkeypatch.setattr("app.routers.process.gemini.generate", rate_limited)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {"file": ("notes.pdf", io.BytesIO(_fake_pdf_bytes()), "application/pdf")}
        resp = await client.post("/api/process", files=files)

    assert resp.status_code == 429
    assert resp.headers["retry-after"] == "17"


@pytest.mark.asyncio
async def test_process_validation_failure_returns_500(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def invalid_model_output(_text):
        return StudyGuideAndQuiz.model_validate({})

    monkeypatch.setattr("app.routers.process.gemini.generate", invalid_model_output)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {"file": ("notes.pdf", io.BytesIO(_fake_pdf_bytes()), "application/pdf")}
        resp = await client.post("/api/process", files=files)

    assert resp.status_code == 500
    assert resp.json()["detail"] == "Gemini response validation failed"


@pytest.mark.asyncio
async def test_other_user_cannot_fetch_document() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as owner:
        files = {"file": ("x.pdf", io.BytesIO(_fake_pdf_bytes()), "application/pdf")}
        resp = await owner.post("/api/process", files=files)
        assert resp.status_code == 200
        document_id = resp.json()["document_id"]

    async with AsyncClient(transport=transport, base_url="http://test") as stranger:
        bootstrap = await stranger.get("/api/whoami")
        assert bootstrap.status_code == 200

        detail = await stranger.get(f"/api/documents/{document_id}")
        assert detail.status_code == 404

        download = await stranger.get(f"/api/documents/{document_id}/download")
        assert download.status_code == 404


@pytest.mark.asyncio
async def test_soft_delete_hides_document() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {"file": ("y.pdf", io.BytesIO(_fake_pdf_bytes()), "application/pdf")}
        resp = await client.post("/api/process", files=files)
        document_id = resp.json()["document_id"]

        deleted = await client.delete(f"/api/documents/{document_id}")
        assert deleted.status_code == 204

        listing = await client.get("/api/documents")
        ids = [item["id"] for item in listing.json()["items"]]
        assert document_id not in ids

        detail = await client.get(f"/api/documents/{document_id}")
        assert detail.status_code == 404
