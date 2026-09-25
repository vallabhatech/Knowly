from pathlib import Path
from types import SimpleNamespace

import pytest

from app.services import storage


class _FakeClient:
    def __init__(self) -> None:
        self.calls: list[tuple] = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb) -> None:
        return None

    async def upload_file(self, source: str, bucket: str, key: str) -> None:
        self.calls.append(("upload_file", source, bucket, key))

    async def generate_presigned_url(self, operation: str, Params: dict, ExpiresIn: int) -> str:
        self.calls.append(("generate_presigned_url", operation, Params, ExpiresIn))
        return "https://storage.test/signed.pdf"

    async def delete_object(self, Bucket: str, Key: str) -> None:
        self.calls.append(("delete_object", Bucket, Key))


@pytest.mark.asyncio
async def test_put_uploads_to_document_prefix(monkeypatch: pytest.MonkeyPatch) -> None:
    fake = _FakeClient()
    monkeypatch.setattr(storage, "_client", lambda: fake)
    monkeypatch.setattr(
        storage,
        "get_settings",
        lambda: SimpleNamespace(storage_bucket="bucket"),
    )

    key = await storage.put("user-1", "doc-1", Path("/tmp/doc.pdf"))

    assert key == "docs/user-1/doc-1.pdf"
    assert fake.calls == [
        ("upload_file", "/tmp/doc.pdf", "bucket", "docs/user-1/doc-1.pdf"),
    ]


@pytest.mark.asyncio
async def test_signed_url_uses_configured_ttl(monkeypatch: pytest.MonkeyPatch) -> None:
    fake = _FakeClient()
    monkeypatch.setattr(storage, "_client", lambda: fake)
    monkeypatch.setattr(
        storage,
        "get_settings",
        lambda: SimpleNamespace(storage_bucket="bucket"),
    )

    url = await storage.signed_url("docs/user-1/doc-1.pdf", expires_in=300)

    assert url == "https://storage.test/signed.pdf"
    assert fake.calls == [
        (
            "generate_presigned_url",
            "get_object",
            {"Bucket": "bucket", "Key": "docs/user-1/doc-1.pdf"},
            300,
        )
    ]


@pytest.mark.asyncio
async def test_delete_removes_object(monkeypatch: pytest.MonkeyPatch) -> None:
    fake = _FakeClient()
    monkeypatch.setattr(storage, "_client", lambda: fake)
    monkeypatch.setattr(
        storage,
        "get_settings",
        lambda: SimpleNamespace(storage_bucket="bucket"),
    )

    await storage.delete("docs/user-1/doc-1.pdf")

    assert fake.calls == [
        ("delete_object", "bucket", "docs/user-1/doc-1.pdf"),
    ]
