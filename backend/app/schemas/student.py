from pydantic import BaseModel, Field
from typing import Optional, List
from app.models.student import VerificationStatusEnum

class StudentResponse(BaseModel):
    id: int
    user_id: int
    name: str
    roll_no: str
    branch: str
    cgpa: float
    backlogs: int
    phone: Optional[str] = None
    resume_path: Optional[str] = None
    extracted_skills: List[str] = []
    resume_score: Optional[int] = None
    verification_status: VerificationStatusEnum
    rejection_reason: Optional[str] = None
    passing_year: int
    is_placed: bool
    placed_package: Optional[float] = None

    class Config:
        from_attributes = True

class StudentUpdate(BaseModel):
    phone: Optional[str] = Field(None, description="Contact phone number")
    backlogs: Optional[int] = Field(None, description="Number of active backlogs")
    cgpa: Optional[float] = Field(None, description="Current CGPA. Updating this will trigger re-verification.")
    roll_no: Optional[str] = Field(None, description="University roll number. Updating this will trigger re-verification.")
    branch: Optional[str] = Field(None, description="Academic branch. Updating this will trigger re-verification.")

class StudentVerify(BaseModel):
    status: VerificationStatusEnum
    rejection_reason: Optional[str] = Field(None, description="Required if status is rejected")
