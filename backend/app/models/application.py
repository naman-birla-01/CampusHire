from sqlalchemy import Column, Integer, String, Float, Enum, ForeignKey, Text, DateTime, Date
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.database import Base

class ApplicationStatusEnum(str, enum.Enum):
    applied = "applied"
    shortlisted = "shortlisted"
    in_progress = "in_progress"
    selected = "selected"
    rejected = "rejected"

class ResultEnum(str, enum.Enum):
    pass_ = "pass"
    fail = "fail"
    pending = "pending"

class OfferStatusEnum(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    declined = "declined"

class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    job_id = Column(Integer, ForeignKey("job_postings.id", ondelete="CASCADE"), nullable=False)
    applied_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(Enum(ApplicationStatusEnum), default=ApplicationStatusEnum.applied)
    current_round = Column(Integer, default=0) # 0 means Applied/Shortlisted, 1 means Round 1, etc.
    ai_match_score = Column(Float, nullable=True) # TF-IDF match score
    remarks = Column(Text, nullable=True)

    student = relationship("Student", backref="applications")
    job = relationship("JobPosting", backref="applications")
    round_results = relationship("RoundResult", back_populates="application", cascade="all, delete-orphan")
    offer = relationship("Offer", back_populates="application", uselist=False, cascade="all, delete-orphan")

class RoundResult(Base):
    __tablename__ = "round_results"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    round_id = Column(Integer, ForeignKey("interview_rounds.id", ondelete="CASCADE"), nullable=False)
    result = Column(Enum(ResultEnum), default=ResultEnum.pending)
    feedback = Column(Text, nullable=True)
    evaluated_at = Column(DateTime(timezone=True), onupdate=func.now())

    application = relationship("Application", back_populates="round_results")
    round = relationship("InterviewRound", backref="results")

class Offer(Base):
    __tablename__ = "offers"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), unique=True, nullable=False)
    offered_package = Column(Float, nullable=False)
    offer_date = Column(Date, nullable=False)
    status = Column(Enum(OfferStatusEnum), default=OfferStatusEnum.pending)

    application = relationship("Application", back_populates="offer")
