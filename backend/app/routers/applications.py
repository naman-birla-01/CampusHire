from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.company import Company
from app.models.student import Student
from app.middleware.auth import get_current_user
from app.schemas.application import (
    ApplicationCreate, ApplicationResponse, ApplicationListItem,
    RoundResultUpdate, OfferCreate, OfferRespond,
)
from app.services import application_service


router = APIRouter(prefix="/api/applications", tags=["Applications"])

# Secondary router for the job-scoped applicants endpoint
job_applicants_router = APIRouter(prefix="/api/jobs", tags=["Applications"])


# ─── Helper dependencies ──────────────────────────────────────────

def get_current_student(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Dependency that ensures the current user is a student and returns the Student record."""
    if current_user.role != RoleEnum.student:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only students can perform this action")
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")
    return student


def get_current_company(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Dependency that ensures the current user is a company and returns the Company record."""
    if current_user.role != RoleEnum.company:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only companies can perform this action")
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company profile not found")
    return company


# ─── Student Endpoints ─────────────────────────────────────────────

@router.post("/", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
def apply_to_job(
    data: ApplicationCreate,
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    """Student applies to a job posting."""
    application = application_service.apply_to_job(student.id, data.job_id, db)
    # Re-fetch with all relations for the response
    return application_service.get_application_by_id(application.id, db)


@router.get("/me", response_model=List[ApplicationListItem])
def get_my_applications(
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    """Student views all their own applications."""
    return application_service.get_applications_for_student(student.id, db)


@router.put("/{application_id}/offer/respond", response_model=ApplicationResponse)
def respond_to_offer(
    application_id: int,
    data: OfferRespond,
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    """Student accepts or declines an offer."""
    application = application_service.respond_to_offer(application_id, data.response, student.id, db)
    return application_service.get_application_by_id(application.id, db)


# ─── Company Endpoints ─────────────────────────────────────────────

@job_applicants_router.get("/{job_id}/applicants", response_model=List[ApplicationListItem])
def get_job_applicants(
    job_id: int,
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db),
):
    """Company views all applicants for one of their job postings, sorted by AI match score."""
    return application_service.get_applications_for_job(job_id, company.id, db)


@router.put("/{application_id}/round/{round_id}", response_model=ApplicationResponse)
def update_round_result(
    application_id: int,
    round_id: int,
    data: RoundResultUpdate,
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db),
):
    """Company evaluates a student's result for a specific interview round."""
    application = application_service.update_round_result(application_id, round_id, data, company.id, db)
    return application_service.get_application_by_id(application.id, db)


@router.post("/{application_id}/offer", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
def issue_offer(
    application_id: int,
    data: OfferCreate,
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db),
):
    """Company issues a formal offer to a candidate."""
    application = application_service.issue_offer(application_id, data, company.id, db)
    return application_service.get_application_by_id(application.id, db)


# ─── TPO / Shared Endpoints ───────────────────────────────────────

@router.get("/", response_model=List[ApplicationListItem])
def list_all_applications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """TPO views all applications across every job."""
    if current_user.role != RoleEnum.tpo:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only TPO can view all applications")
    return application_service.get_all_applications(db)


@router.get("/{application_id}", response_model=ApplicationResponse)
def get_application_detail(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get detailed view of a single application. Accessible by the student, the owning company, or TPO."""
    application = application_service.get_application_by_id(application_id, db)

    # Authorization: student can view their own, company can view their job's, TPO can view all
    if current_user.role == RoleEnum.student:
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not student or application.student_id != student.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this application")

    elif current_user.role == RoleEnum.company:
        company = db.query(Company).filter(Company.user_id == current_user.id).first()
        if not company or application.job.company_id != company.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this application")

    # TPO can view everything — no additional check needed

    return application
