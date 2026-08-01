from pydantic import BaseModel
from datetime import datetime


class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    read: bool
    created_at: datetime

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_obj(cls, obj):
        """Map ORM field `is_read` → schema field `read`."""
        return cls(
            id=obj.id,
            title=obj.title,
            message=obj.message,
            read=obj.is_read,
            created_at=obj.created_at,
        )
