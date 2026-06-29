from sqlalchemy import Column, Integer, String, Float, ForeignKey, JSON, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class AIResumeAnalysis(Base):
    __tablename__ = "ai_resume_analysis"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), unique=True, nullable=False)
    extracted_skills = Column(JSON, default=list)
    score = Column(Integer, nullable=False)
    suggestions = Column(JSON, default=list) # List of improvement tips
    ats_rating = Column(String, nullable=True) # High/Medium/Low
    analyzed_at = Column(DateTime(timezone=True), server_default=func.now())

    student = relationship("Student", backref="resume_analysis")

class SkillGapReport(Base):
    __tablename__ = "skill_gap_reports"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    job_id = Column(Integer, ForeignKey("job_postings.id", ondelete="CASCADE"), nullable=False)
    matched_skills = Column(JSON, default=list)
    missing_skills = Column(JSON, default=list)
    match_percentage = Column(Float, nullable=False)
    learning_path = Column(JSON, default=list) # List of suggested learning resources
    generated_at = Column(DateTime(timezone=True), server_default=func.now())

    student = relationship("Student", backref="skill_gap_reports")
    job = relationship("JobPosting", backref="skill_gap_reports")
