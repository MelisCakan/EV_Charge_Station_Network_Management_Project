from typing import Generic, TypeVar, Type, Optional
from sqlmodel import SQLModel, Session, select

T = TypeVar("T", bound=SQLModel)


class BaseRepository(Generic[T]):
    """Generic repository providing CRUD operations for all SQLModel entities."""

    def __init__(self, model: Type[T], session: Session):
        self.model = model
        self.session = session

    def get_by_id(self, entity_id: int) -> Optional[T]:
        return self.session.get(self.model, entity_id)

    def get_all(self) -> list[T]:
        return list(self.session.exec(select(self.model)).all())

    def create(self, entity: T) -> T:
        self.session.add(entity)
        self.session.commit()
        self.session.refresh(entity)
        return entity

    def create_many(self, entities: list[T]) -> list[T]:
        self.session.add_all(entities)
        self.session.commit()
        for entity in entities:
            self.session.refresh(entity)
        return entities

    def update(self, entity: T) -> T:
        self.session.add(entity)
        self.session.commit()
        self.session.refresh(entity)
        return entity

    def delete(self, entity: T) -> None:
        self.session.delete(entity)
        self.session.commit()

    def delete_by_id(self, entity_id: int) -> bool:
        entity = self.get_by_id(entity_id)
        if entity:
            self.delete(entity)
            return True
        return False

    def count(self) -> int:
        return len(self.get_all())

    def exists(self, entity_id: int) -> bool:
        return self.get_by_id(entity_id) is not None
