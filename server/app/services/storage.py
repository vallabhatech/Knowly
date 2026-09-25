from pathlib import Path

import aioboto3

from app.core.config import get_settings


def _storage_key(user_id: str, document_id: str) -> str:
    return f"docs/{user_id}/{document_id}.pdf"


def _client():
    settings = get_settings()
    session = aioboto3.Session()
    return session.client(
        "s3",
        endpoint_url=settings.storage_endpoint,
        aws_access_key_id=settings.storage_access_key,
        aws_secret_access_key=settings.storage_secret_key,
        region_name="auto",
    )


async def put(user_id: str, document_id: str, source: Path) -> str:
    """Upload local file to object storage; return storage_key."""
    key = _storage_key(user_id, document_id)
    settings = get_settings()

    async with _client() as client:
        await client.upload_file(str(source), settings.storage_bucket, key)

    return key


async def signed_url(storage_key: str, expires_in: int = 600) -> str:
    settings = get_settings()
    async with _client() as client:
        return await client.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.storage_bucket, "Key": storage_key},
            ExpiresIn=expires_in,
        )


async def delete(storage_key: str) -> None:
    settings = get_settings()
    async with _client() as client:
        await client.delete_object(Bucket=settings.storage_bucket, Key=storage_key)
