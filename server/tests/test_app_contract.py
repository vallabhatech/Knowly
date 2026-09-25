from httpx import ASGITransport, AsyncClient

from app.main import app


async def test_openapi_metadata_and_core_routes() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        openapi = await client.get("/openapi.json")
        health = await client.get("/health")

    assert openapi.status_code == 200
    schema = openapi.json()
    assert schema["info"]["title"] == "Knowly API"
    assert schema["info"]["version"] == "0.1.0"

    paths = schema["paths"]
    assert "/health" in paths
    assert "/api/process" in paths
    assert "/api/documents" in paths
    assert "/api/attempts" in paths
    assert "/api/chat" in paths
    assert health.json() == {"status": "ok"}
