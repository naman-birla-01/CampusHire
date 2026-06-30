from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from app.models.user import RoleEnum

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters long")
    role: RoleEnum
    # Fields for student/company profile creation during registration
    name: str = Field(..., description="Student Name or Company Name")
    roll_no: Optional[str] = Field(None, description="Required if role is student")
    branch: Optional[str] = Field(None, description="Required if role is student")
    cgpa: Optional[float] = Field(None, description="Required if role is student")
    passing_year: Optional[int] = Field(None, description="Required if role is student")

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    role: RoleEnum
    name: str

    class Config:
        from_attributes = True
