from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

class BaseRepository:
    def __init__(self, db: AsyncSession):
        self.model = None
        self.db = db

    async def get(self, object_id):
        """Получить объект по ID"""
        result = await self.db.execute(
            select(self.model).where(self.model.id == object_id)
        )
        return result.scalar_one_or_none()

    async def get_all(self):
        """Получить все объекты"""
        result = await self.db.execute(select(self.model))
        return result.scalars().all()

    async def create(self, obj):
        """Создать объект"""
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)
        return obj

    async def update(self, obj):
        """Обновить объект"""
        await self.db.commit()
        await self.db.refresh(obj)
        return obj

    async def delete(self, obj):
        """Удалить объект"""
        self.db.delete(obj)
        await self.db.commit()