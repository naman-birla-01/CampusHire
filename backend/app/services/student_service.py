from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.student import Student, VerificationStatusEnum
from app.models.notification import Notification
from app.schemas.student import StudentUpdate, StudentVerify

def get_student_by_user_id(user_id: int, db: Session):
    student = db.query(Student).filter(Student.user_id == user_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")
    return student

def get_all_students(db: Session, branch: str = None, verified: bool = None):
    query = db.query(Student)
    if branch:
        query = query.filter(Student.branch == branch)
    if verified is not None:
        if verified:
            query = query.filter(Student.verification_status == VerificationStatusEnum.verified)
        else:
            query = query.filter(Student.verification_status != VerificationStatusEnum.verified)
    return query.all()

def update_student_profile(student_id: int, data: StudentUpdate, db: Session):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    needs_verification = False
    update_data = data.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        if getattr(student, key) != value:
            setattr(student, key, value)
            if key in ["cgpa", "roll_no", "branch"]:
                needs_verification = True
                
    if needs_verification:
        student.verification_status = VerificationStatusEnum.pending
        
    db.commit()
    db.refresh(student)
    return student

def verify_student(student_id: int, verify_data: StudentVerify, db: Session):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    student.verification_status = verify_data.status
    if verify_data.status == VerificationStatusEnum.rejected:
        student.rejection_reason = verify_data.rejection_reason
    else:
        student.rejection_reason = None
        
    # Create notification
    title = f"Verification {verify_data.status.value.capitalize()}"
    message = "Your academic details have been successfully verified by the TPO." if verify_data.status == VerificationStatusEnum.verified else f"Your verification failed. Reason: {verify_data.rejection_reason}"
    
    notification = Notification(
        user_id=student.user_id,
        title=title,
        message=message
    )
    db.add(notification)
    db.commit()
    db.refresh(student)
    return student
