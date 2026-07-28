from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import shutil
from app.database import get_db
from app.models.user import User, RoleEnum
from app.middleware.auth import get_current_user
from app.schemas.student import StudentResponse, StudentUpdate, StudentVerify
from app.services.student_service import (
    get_student_by_user_id, get_all_students, 
    update_student_profile, verify_student
)

router = APIRouter(prefix="/api/students", tags=["Students"])

def get_current_tpo(current_user: User = Depends(get_current_user)):
    if current_user.role != RoleEnum.tpo:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized as TPO")
    return current_user

@router.get("/me", response_model=StudentResponse)
def get_my_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != RoleEnum.student:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a student account")
    return get_student_by_user_id(current_user.id, db)

@router.put("/me", response_model=StudentResponse)
def update_my_profile(data: StudentUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != RoleEnum.student:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a student account")
    student = get_student_by_user_id(current_user.id, db)
    return update_student_profile(student.id, data, db)

@router.get("/", response_model=List[StudentResponse])
def list_students(
    branch: Optional[str] = Query(None),
    verified: Optional[bool] = Query(None),
    current_user: User = Depends(get_current_tpo), 
    db: Session = Depends(get_db)
):
    return get_all_students(db, branch=branch, verified=verified)

@router.get("/{student_id}", response_model=StudentResponse)
def get_student(student_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from app.models.student import Student
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return student

@router.put("/{student_id}/verify", response_model=StudentResponse)
def verify_student_profile(
    student_id: int, 
    verify_data: StudentVerify, 
    current_user: User = Depends(get_current_tpo), 
    db: Session = Depends(get_db)
):
    return verify_student(student_id, verify_data, db)

@router.post("/me/resume")
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != RoleEnum.student:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a student account")
    
    student = get_student_by_user_id(current_user.id, db)
    
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only PDF files are allowed")
        
    upload_dir = "uploads/resumes"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, f"{student.id}_{file.filename}")
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    student.resume_path = file_path
    db.commit()
    db.refresh(student)
    
    # Trigger AI analysis automatically after upload (Mock for now, will be implemented in 4.2)
    # try:
    #     from app.services.ai_service import analyze_resume_with_gemini
    #     analyze_resume_with_gemini(student.id, file_path, db)
    # except ImportError:
    #     pass
    
    return {"message": "Resume uploaded successfully", "file_path": file_path}
