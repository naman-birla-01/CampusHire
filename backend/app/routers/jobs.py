from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.company import Company
from app.models.student import Student
from app.middleware.auth import get_current_user
from app.schemas.job import JobCreate, JobUpdate, JobResponse, JobListItem
from app.services import job_service

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])


# ─── Helper dependencies ──────────────────────────────────────────

def get_current_company(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Dependency that ensures the current user is a company and returns the Company record."""
    if current_user.role != RoleEnum.company:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only companies can perform this action")
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company profile not found")
    return company


def get_current_student(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Dependency that ensures the current user is a student and returns the Student record."""
    if current_user.role != RoleEnum.student:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only students can access this endpoint")
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")
    return student


# ─── Endpoints ─────────────────────────────────────────────────────

@router.post("/", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
def create_job(
    job_data: JobCreate,
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db),
):
    """Company creates a new job posting with interview rounds."""
    return job_service.create_job(company.id, job_data, db)


@router.get("/eligible", response_model=List[JobListItem])
def get_eligible_jobs(
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    """Student views only the jobs they are eligible for."""
    return job_service.get_eligible_jobs_for_student(student.id, db)


@router.get("/", response_model=List[JobListItem])
def list_jobs(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by job status: open, closed, on_hold"),
    job_type: Optional[str] = Query(None, description="Filter by job type: fulltime, internship, ppo"),
    company_id: Optional[int] = Query(None, description="Filter by company ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all jobs with optional filters. Available to students, companies, and TPO."""
    from app.models.job import JobStatusEnum, JobTypeEnum

    parsed_status = None
    if status_filter:
        try:
            parsed_status = JobStatusEnum(status_filter)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid status: {status_filter}")

    parsed_type = None
    if job_type:
        try:
            parsed_type = JobTypeEnum(job_type)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid job_type: {job_type}")

    return job_service.get_all_jobs(db, status_filter=parsed_status, job_type=parsed_type, company_id=company_id)


@router.get("/{job_id}", response_model=JobResponse)
def get_job_detail(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get full detail view of a job including all interview rounds."""
    return job_service.get_job_by_id(job_id, db)


@router.put("/{job_id}", response_model=JobResponse)
def update_job(
    job_id: int,
    job_data: JobUpdate,
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db),
):
    """Company updates their job posting (status, deadline, or description)."""
    return job_service.update_job(job_id, job_data, company.id, db)


@router.delete("/{job_id}")
def delete_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a job posting. Only the owning company or TPO can delete."""
    if current_user.role == RoleEnum.tpo:
        return job_service.delete_job(job_id, company_id=None, db=db, is_tpo=True)
    elif current_user.role == RoleEnum.company:
        company = db.query(Company).filter(Company.user_id == current_user.id).first()
        if not company:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company profile not found")
        return job_service.delete_job(job_id, company_id=company.id, db=db)
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete jobs")
