from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from app.models.job import JobTypeEnum, JobStatusEnum, ModeEnum
from app.schemas.company import CompanyResponse


# ─── Interview Round Schemas ───────────────────────────────────────

class InterviewRoundCreate(BaseModel):
    """Schema for creating an interview round as part of a job posting."""
    round_name: str = Field(..., description="Name of the round, e.g. 'Aptitude Test', 'Technical Interview'")
    scheduled_at: datetime = Field(..., description="Scheduled date and time for the round")
    venue_or_link: str = Field(..., description="Physical venue address or online meeting link")
    mode: ModeEnum = Field(ModeEnum.online, description="Mode of the interview round")
    instructions: Optional[str] = Field(None, description="Additional instructions for candidates")


class InterviewRoundResponse(BaseModel):
    """Full interview round data returned in responses."""
    id: int
    job_id: int
    round_number: int
    round_name: str
    scheduled_at: datetime
    venue_or_link: str
    mode: ModeEnum
    instructions: Optional[str] = None

    class Config:
        from_attributes = True


# ─── Job Schemas ───────────────────────────────────────────────────

class JobCreate(BaseModel):
    """Schema for a company creating a new job posting with interview rounds."""
    title: str = Field(..., description="Job title")
    description: str = Field(..., description="Detailed job description")
    required_skills: List[str] = Field(default=[], description="List of required skills, e.g. ['Python', 'SQL']")
    min_cgpa: float = Field(..., ge=0.0, le=10.0, description="Minimum CGPA required")
    max_backlogs: int = Field(0, ge=0, description="Maximum number of active backlogs allowed")
    eligible_branches: List[str] = Field(default=[], description="List of eligible branches, e.g. ['CSE', 'IT', 'ECE']")
    package_lpa: float = Field(..., gt=0, description="Package offered in LPA")
    job_type: JobTypeEnum = Field(..., description="Type of job: fulltime, internship, or ppo")
    application_deadline: date = Field(..., description="Last date for applications")
    rounds: List[InterviewRoundCreate] = Field(default=[], description="Interview rounds for this job")


class JobUpdate(BaseModel):
    """Schema for updating an existing job posting (company only)."""
    status: Optional[JobStatusEnum] = Field(None, description="Update job status: open, closed, or on_hold")
    application_deadline: Optional[date] = Field(None, description="Update the application deadline")
    description: Optional[str] = Field(None, description="Update the job description")


class JobResponse(BaseModel):
    """Full job data with nested company and interview rounds."""
    id: int
    company_id: int
    title: str
    description: str
    required_skills: List[str] = []
    min_cgpa: float
    max_backlogs: int
    eligible_branches: List[str] = []
    package_lpa: float
    job_type: JobTypeEnum
    application_deadline: date
    status: JobStatusEnum
    created_at: datetime
    company: CompanyResponse
    rounds: List[InterviewRoundResponse] = []

    class Config:
        from_attributes = True


class JobListItem(BaseModel):
    """Trimmed job data for listing views (no rounds detail)."""
    id: int
    company_id: int
    title: str
    description: str
    required_skills: List[str] = []
    min_cgpa: float
    max_backlogs: int
    eligible_branches: List[str] = []
    package_lpa: float
    job_type: JobTypeEnum
    application_deadline: date
    status: JobStatusEnum
    created_at: datetime
    company: CompanyResponse

    class Config:
        from_attributes = True
