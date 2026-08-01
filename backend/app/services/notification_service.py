from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.notification import Notification


def create_notification(user_id: int, title: str, message: str, db: Session) -> Notification:
    """
    Internal helper called by all other services to create a notification.
    Does NOT commit — callers should commit their own transactions.
    """
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        is_read=False,
    )
    db.add(notification)
    db.flush()  # Persist within the caller's transaction without committing
    return notification


def get_notifications_for_user(user_id: int, db: Session) -> list[Notification]:
    """Fetch all notifications for a user, latest first."""
    return (
        db.query(Notification)
        .filter(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .all()
    )


def mark_as_read(notification_id: int, user_id: int, db: Session) -> Notification:
    """Mark a single notification as read. Raises 404 if not found or doesn't belong to the user."""
    notification = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == user_id)
        .first()
    )
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification


def mark_all_as_read(user_id: int, db: Session) -> dict:
    """Mark all of a user's notifications as read."""
    updated = (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.is_read == False)
        .all()
    )
    for notification in updated:
        notification.is_read = True
    db.commit()
    return {"updated_count": len(updated)}
