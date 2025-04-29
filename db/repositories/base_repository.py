from sqlalchemy.orm import Session

class BaseRepository:
    def __init__(self, db: Session):
        self.model = None
        self.db = db

    def get(self, object_id):
        return self.db.query(self.model).filter(self.model.id == object_id).first()

    def get_all(self):
        return self.db.query(self.model).all()

    def create(self, obj):
        self.db.add(obj)
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def update(self, obj):
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def delete(self, obj):
        self.db.delete(obj)
        self.db.commit()
