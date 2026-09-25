"""add user auth columns

Revision ID: 7f2a0d8d5c13
Revises: 29a56e40f145
Create Date: 2026-04-29 04:20:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "7f2a0d8d5c13"
down_revision: str | None = "29a56e40f145"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("user", sa.Column("email", sa.String(length=254), nullable=True))
    op.add_column("user", sa.Column("auth_provider", sa.String(length=16), nullable=True))
    op.add_column("user", sa.Column("name", sa.String(length=200), nullable=True))
    op.add_column("user", sa.Column("picture", sa.String(), nullable=True))
    op.add_column("user", sa.Column("last_login_at", sa.DateTime(), nullable=True))
    op.create_index(
        "ix_user_email_lower",
        "user",
        [sa.text("lower(email)")],
        unique=True,
        postgresql_where=sa.text("email IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("ix_user_email_lower", table_name="user")
    op.drop_column("user", "last_login_at")
    op.drop_column("user", "picture")
    op.drop_column("user", "name")
    op.drop_column("user", "auth_provider")
    op.drop_column("user", "email")
