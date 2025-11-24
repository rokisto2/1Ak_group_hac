"""remove excel and docks add file

Revision ID: e7192302ea25
Revises: a736d2d960d4
Create Date: 2025-11-23 23:10:33.581595

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e7192302ea25'
down_revision: Union[str, None] = 'a736d2d960d4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
