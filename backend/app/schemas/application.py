from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from app.models.application import ApplicationStatusEnum, ResultEnum, OfferStatusEnum
from app.schemas.student import StudentResponse
from app.schemas.job import JobResponse, InterviewRoundResponse


# ─── Application Create / Input Schemas ────────────────────────────

class ApplicationCreate(BaseModel):
    """Student applies to a job. Student ID is derived from the JWT token."""
    job_id: int = Field(..., description="ID of the job to apply for")


# ─── Round Result Schemas ──────────────────────────────────────────

class RoundResultUpdate(BaseModel):
    """Company evaluates a student's performance in a specific interview round."""
    result: ResultEnum = Field(..., description="Round result: pass, fail, or pending")
    feedback: Optional[str] = Field(None, description="Feedback from the interviewer")


class RoundResultResponse(BaseModel):
    """Full round result data returned in responses."""
    id: int
    application_id: int
    round_id: int
    result: ResultEnum
    feedback: Optional[str] = None
    evaluated_at: Optional[datetime] = None
    round: InterviewRoundResponse

    class Config:
        from_attributes = True


# ─── Offer Schemas ─────────────────────────────────────────────────

class OfferCreate(BaseModel):
    """Company issues an offer to a selected candidate."""
    offered_package: float = Field(..., gt=0, description="Offered package in LPA")
    offer_date: date = Field(..., description="Date of the offer")


class OfferResponse(BaseModel):
    """Offer details returned in responses."""
    id: int
    offered_package: float
    offer_date: date
    status: OfferStatusEnum

    class Config:
        from_attributes = True


class OfferRespond(BaseModel):
    """Student accepts or declines an offer."""
    response: OfferStatusEnum = Field(
        ...,
        description="Student's response to the offer: accepted or declined",
    )


# ─── Application Response Schemas ──────────────────────────────────

class ApplicationResponse(BaseModel):
    """Full application detail with nested student, job, round results, and offer."""
    id: int
    student_id: int
    job_id: int
    applied_at: datetime
    status: ApplicationStatusEnum
    current_round: int
    ai_match_score: Optional[float] = None
    remarks: Optional[str] = None
    student: StudentResponse
    job: JobResponse
    round_results: List[RoundResultResponse] = []
    offer: Optional[OfferResponse] = None

    class Config:
        from_attributes = True


class ApplicationListItem(BaseModel):
    """Trimmed application data for listing views (no nested round results)."""
    id: int
    student_id: int
    job_id: int
    applied_at: datetime
    status: ApplicationStatusEnum
    current_round: int
    ai_match_score: Optional[float] = None
    remarks: Optional[str] = None
    student: StudentResponse
    job: JobResponse
    offer: Optional[OfferResponse] = None

    class Config:
        from_attributes = True
