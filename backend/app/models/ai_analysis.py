from sqlalchemy import Column, Integer, String, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.models.student import Student
from app.models.job import JobPosting
from app.database import Base

class AIResumeAnalysis(Base):
    __tablename__ = "ai_resume_analysis"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    resume_text = Column(Text, nullable=True)
    extracted_skills = Column(JSON, default=list)
    resume_score = Column(Integer, nullable=True)

    student = relationship("Student", backref="ai_resume_analyses")

class SkillGapReport(Base):
    __tablename__ = "skill_gap_reports"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    gap_analysis = Column(Text, nullable=True)
    study_plan = Column(Text, nullable=True)

    student = relationship("Student", backref="skill_gap_reports")
    job = relationship("JobPosting", backref="skill_gap_reports")
