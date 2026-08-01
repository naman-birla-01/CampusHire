from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.user import User
from app.middleware.auth import get_current_user
from app.schemas.notification import NotificationResponse
from app.services.notification_service import (
    get_notifications_for_user,
    mark_as_read,
    mark_all_as_read,
)

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


# ─── GET /api/notifications/ ────────────────────────────────────────
@router.get("/", response_model=List[NotificationResponse])
def get_my_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Fetch the current user's notifications, newest first."""
    notifications = get_notifications_for_user(current_user.id, db)
    return [NotificationResponse.from_orm_obj(n) for n in notifications]


# ─── PUT /api/notifications/{id}/read ───────────────────────────────
@router.put("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a single notification as read."""
    notification = mark_as_read(notification_id, current_user.id, db)
    return NotificationResponse.from_orm_obj(notification)


# ─── PUT /api/notifications/read-all ────────────────────────────────
@router.put("/read-all")
def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark all of the current user's notifications as read."""
    return mark_all_as_read(current_user.id, db)
