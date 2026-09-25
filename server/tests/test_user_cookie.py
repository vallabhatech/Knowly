import pytest
from httpx import ASGITransport, AsyncClient

from app.deps import COOKIE_NAME
from app.main import app


@pytest.mark.asyncio
async def test_cookie_issued_on_first_request_and_persists() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        first = await client.get("/api/whoami")
        assert first.status_code == 200
        first_id = first.json()["user_id"]

        set_cookie = first.headers.get("set-cookie", "")
        lowered = set_cookie.lower()
        assert COOKIE_NAME in set_cookie
        assert "httponly" in lowered
        assert "samesite=lax" in lowered

        second = await client.get("/api/whoami")
        assert second.status_code == 200
        assert second.json()["user_id"] == first_id
        assert "set-cookie" not in second.headers


@pytest.mark.asyncio
async def test_tampered_cookie_yields_fresh_user_id() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        first = await client.get("/api/whoami")
        original_id = first.json()["user_id"]

        client.cookies.clear()
        client.cookies.set(COOKIE_NAME, "this-is-not-a-valid-signed-cookie")

        tampered = await client.get("/api/whoami")
        assert tampered.status_code == 200
        assert tampered.json()["user_id"] != original_id
        assert "set-cookie" in tampered.headers
