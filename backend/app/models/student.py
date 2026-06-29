from sqlalchemy import Column, Integer, String, Float, Boolean, Enum, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
import enum
from app.database import Base

class VerificationStatusEnum(str, enum.Enum):
    pending = "pending"
    verified = "verified"
    rejected = "rejected"

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    name = Column(String, nullable=False)
    roll_no = Column(String, unique=True, index=True, nullable=False)
    branch = Column(String, nullable=False)
    cgpa = Column(Float, nullable=False)
    backlogs = Column(Integer, default=0)
    phone = Column(String, nullable=True)
    resume_path = Column(String, nullable=True)
    extracted_skills = Column(JSON, default=list) # Stored as JSON array
    resume_score = Column(Integer, nullable=True)
    verification_status = Column(Enum(VerificationStatusEnum), default=VerificationStatusEnum.pending)
    rejection_reason = Column(Text, nullable=True)
    passing_year = Column(Integer, nullable=False)
    is_placed = Column(Boolean, default=False)
    placed_package = Column(Float, nullable=True) # Package in LPA

    user = relationship("User", backref="student_profile")
