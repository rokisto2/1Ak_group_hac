"""Replace integer IDs in users table with UUIDs.

Revision ID: 2c224df9a041
Revises: b3e6d06d5b6e
Create Date: 2025-04-30 16:40:21.950352
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '2c224df9a041'
down_revision: Union[str, None] = 'b3e6d06d5b6e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    # Включаем расширение pgcrypto (если не включено)
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")

    # Добавляем новый столбец с UUID и значением по умолчанию
    op.add_column('users', sa.Column('uuid', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")))

    # Обновляем внешние ключи в других таблицах здесь при необходимости

    # Удаляем старый первичный ключ
    op.drop_constraint('users_pkey', 'users', type_='primary')

    # Удаляем старый id-столбец
    op.drop_column('users', 'id')

    # Переименовываем uuid в id
    op.alter_column('users', 'uuid', new_column_name='id')

    # Создаём новый первичный ключ
    op.create_primary_key('users_pkey', 'users', ['id'])

    # Создаем таблицу activation_keys
    op.create_table(
        'activation_keys',
        sa.Column('key', sa.String(length=10), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('key'),
        sa.UniqueConstraint('key'),
        sa.UniqueConstraint('user_id')
    )

    # Остальные изменения users
    op.drop_index('ix_generated_at', table_name='generated_reports')
    op.add_column('users', sa.Column('chat_id', sa.String(), nullable=True))
    op.add_column('users', sa.Column('email', sa.String(), nullable=False))
    op.add_column('users', sa.Column('password_hash', sa.String(), nullable=False))
    op.add_column('users', sa.Column('user_type', sa.String(), nullable=True))
    op.alter_column('users', 'full_name', existing_type=sa.VARCHAR(), nullable=False)
    op.drop_constraint('users_telegram_id_key', 'users', type_='unique')
    op.create_unique_constraint(None, 'users', ['email'])
    op.create_unique_constraint(None, 'users', ['chat_id'])
    op.drop_column('users', 'telegram_id')
    op.drop_column('users', 'is_active')


def downgrade() -> None:
    """Downgrade schema."""

    # Восстанавливаем INT id
    op.add_column('users', sa.Column('int_id', sa.Integer(), autoincrement=True, nullable=False))

    # Удаляем UUID PK
    op.drop_constraint('users_pkey', 'users', type_='primary')
    op.drop_column('users', 'id')

    # Переименовываем обратно
    op.alter_column('users', 'int_id', new_column_name='id')

    # Создаём INT PK
    op.create_primary_key('users_pkey', 'users', ['id'])

    # Восстанавливаем старые поля
    op.add_column('users', sa.Column('is_active', sa.INTEGER(), autoincrement=False, nullable=True))
    op.add_column('users', sa.Column('telegram_id', sa.VARCHAR(), autoincrement=False, nullable=False))
    op.drop_constraint(None, 'users', type_='unique')
    op.drop_constraint(None, 'users', type_='unique')
    op.create_unique_constraint('users_telegram_id_key', 'users', ['telegram_id'])
    op.alter_column('users', 'full_name', existing_type=sa.VARCHAR(), nullable=True)
    op.drop_column('users', 'user_type')
    op.drop_column('users', 'password_hash')
    op.drop_column('users', 'email')
    op.drop_column('users', 'chat_id')

    # Индекс
    op.create_index('ix_generated_at', 'generated_reports', ['generated_at'], unique=False)

    # Удаляем таблицу активаций
    op.drop_table('activation_keys')
