from sqlalchemy import Column, Integer, String, Float, Enum, ForeignKey, Text, JSON, Date, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.database import Base

class JobTypeEnum(str, enum.Enum):
    fulltime = "fulltime"
    internship = "internship"
    ppo = "ppo"

class JobStatusEnum(str, enum.Enum):
    open = "open"
    closed = "closed"
    on_hold = "on_hold"

class ModeEnum(str, enum.Enum):
    online = "online"
    offline = "offline"

class JobPosting(Base):
    __tablename__ = "job_postings"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    required_skills = Column(JSON, default=list) # List of required skills
    min_cgpa = Column(Float, nullable=False)
    max_backlogs = Column(Integer, nullable=False, default=0)
    eligible_branches = Column(JSON, default=list) # List of allowed branches
    package_lpa = Column(Float, nullable=False)
    job_type = Column(Enum(JobTypeEnum), nullable=False)
    application_deadline = Column(Date, nullable=False)
    status = Column(Enum(JobStatusEnum), default=JobStatusEnum.open)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    company = relationship("Company", backref="job_postings")
    rounds = relationship("InterviewRound", back_populates="job", cascade="all, delete-orphan")

class InterviewRound(Base):
    __tablename__ = "interview_rounds"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("job_postings.id", ondelete="CASCADE"), nullable=False)
    round_number = Column(Integer, nullable=False) # e.g., 1 for Aptitude, 2 for Tech
    round_name = Column(String, nullable=False) # e.g., "Aptitude Test", "Technical Round"
    scheduled_at = Column(DateTime(timezone=True), nullable=False)
    venue_or_link = Column(String, nullable=False)
    mode = Column(Enum(ModeEnum), default=ModeEnum.online)
    instructions = Column(Text, nullable=True)

    job = relationship("JobPosting", back_populates="rounds")
