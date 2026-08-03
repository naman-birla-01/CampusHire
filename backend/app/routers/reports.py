from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.student import Student, VerificationStatusEnum
from app.models.company import Company
from app.models.job import JobPosting
from app.models.application import Application, ApplicationStatusEnum, Offer, OfferStatusEnum
from app.middleware.auth import get_current_user


router = APIRouter(prefix="/api/reports", tags=["Reports"])


# ─── Response Schemas (inline — reports are TPO-only so no shared schema file needed) ────

class BranchPlacementStat(BaseModel):
    branch: str
    total: int
    placed: int
    placement_percentage: float

class CompanyOfferStat(BaseModel):
    company_id: int
    company_name: str
    offer_count: int

class PlacementSummary(BaseModel):
    total_students: int
    placed_students: int
    placement_percentage: float
    average_package_lpa: Optional[float]
    highest_package_lpa: Optional[float]
    branch_breakdown: List[BranchPlacementStat]
    company_offer_stats: List[CompanyOfferStat]

class PlacedStudentInfo(BaseModel):
    student_id: int
    name: str
    roll_no: str
    branch: str
    cgpa: float
    placed_package: float
    company_name: Optional[str]

    class Config:
        from_attributes = True

class UnplacedStudentInfo(BaseModel):
    student_id: int
    name: str
    roll_no: str
    branch: str
    cgpa: float
    backlogs: int
    passing_year: int

    class Config:
        from_attributes = True


# ─── TPO Guard Dependency ─────────────────────────────────────────────────────

def require_tpo(current_user: User = Depends(get_current_user)) -> User:
    """Dependency that restricts the endpoint to TPO users only."""
    if current_user.role != RoleEnum.tpo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only TPO can access placement reports",
        )
    return current_user


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/summary", response_model=PlacementSummary)
def get_placement_summary(
    _: User = Depends(require_tpo),
    db: Session = Depends(get_db),
) -> PlacementSummary:
    """
    TPO: High-level placement statistics dashboard.

    Returns total/placed student counts, average & highest package,
    branch-wise breakdown, and company-wise offer counts.
    """
    # ── Overall counts ──────────────────────────────────────────────
    total_students: int = db.query(Student).count()
    placed_students: int = db.query(Student).filter(Student.is_placed == True).count()  # noqa: E712

    placement_pct: float = (
        round((placed_students / total_students) * 100, 2) if total_students > 0 else 0.0
    )

    # ── Package stats (only from students who are placed) ───────────
    pkg_stats = (
        db.query(
            func.avg(Student.placed_package).label("avg_pkg"),
            func.max(Student.placed_package).label("max_pkg"),
        )
        .filter(Student.is_placed == True)  # noqa: E712
        .first()
    )
    avg_package: Optional[float] = round(pkg_stats.avg_pkg, 2) if pkg_stats.avg_pkg else None
    highest_package: Optional[float] = pkg_stats.max_pkg

    # ── Branch-wise breakdown ────────────────────────────────────────
    # Fetch distinct branches present in the system
    branch_rows = db.query(Student.branch, func.count(Student.id).label("total")).group_by(Student.branch).all()

    branch_breakdown: List[BranchPlacementStat] = []
    for row in branch_rows:
        placed_in_branch: int = (
            db.query(Student)
            .filter(Student.branch == row.branch, Student.is_placed == True)  # noqa: E712
            .count()
        )
        branch_breakdown.append(
            BranchPlacementStat(
                branch=row.branch,
                total=row.total,
                placed=placed_in_branch,
                placement_percentage=round((placed_in_branch / row.total) * 100, 2) if row.total > 0 else 0.0,
            )
        )

    # ── Company-wise offer count ─────────────────────────────────────
    # Count accepted offers per company (via Application → JobPosting → Company)
    company_offer_rows = (
        db.query(
            Company.id.label("company_id"),
            Company.company_name.label("company_name"),
            func.count(Offer.id).label("offer_count"),
        )
        .join(JobPosting, JobPosting.company_id == Company.id)
        .join(Application, Application.job_id == JobPosting.id)
        .join(Offer, Offer.application_id == Application.id)
        .filter(Offer.status == OfferStatusEnum.accepted)
        .group_by(Company.id, Company.company_name)
        .order_by(func.count(Offer.id).desc())
        .all()
    )

    company_offer_stats: List[CompanyOfferStat] = [
        CompanyOfferStat(
            company_id=r.company_id,
            company_name=r.company_name,
            offer_count=r.offer_count,
        )
        for r in company_offer_rows
    ]

    return PlacementSummary(
        total_students=total_students,
        placed_students=placed_students,
        placement_percentage=placement_pct,
        average_package_lpa=avg_package,
        highest_package_lpa=highest_package,
        branch_breakdown=branch_breakdown,
        company_offer_stats=company_offer_stats,
    )


@router.get("/students/placed", response_model=List[PlacedStudentInfo])
def get_placed_students(
    _: User = Depends(require_tpo),
    db: Session = Depends(get_db),
) -> List[PlacedStudentInfo]:
    """
    TPO: List of all placed students with the company that accepted them and the offered package.

    The company name is resolved from the most recent *accepted* offer linked to the student.
    """
    placed_students = (
        db.query(Student)
        .filter(Student.is_placed == True)  # noqa: E712
        .order_by(Student.placed_package.desc())
        .all()
    )

    result: List[PlacedStudentInfo] = []
    for student in placed_students:
        # Find the accepted offer for this student to get the company name
        accepted_offer = (
            db.query(Offer)
            .join(Application, Application.id == Offer.application_id)
            .join(JobPosting, JobPosting.id == Application.job_id)
            .join(Company, Company.id == JobPosting.company_id)
            .filter(
                Application.student_id == student.id,
                Offer.status == OfferStatusEnum.accepted,
            )
            .order_by(Offer.id.desc())
            .first()
        )

        company_name: Optional[str] = None
        if accepted_offer:
            job = db.query(JobPosting).filter(JobPosting.id == accepted_offer.application.job_id).first()
            if job:
                company = db.query(Company).filter(Company.id == job.company_id).first()
                company_name = company.company_name if company else None

        result.append(
            PlacedStudentInfo(
                student_id=student.id,
                name=student.name,
                roll_no=student.roll_no,
                branch=student.branch,
                cgpa=student.cgpa,
                placed_package=student.placed_package or 0.0,
                company_name=company_name,
            )
        )

    return result


@router.get("/students/unplaced", response_model=List[UnplacedStudentInfo])
def get_unplaced_students(
    _: User = Depends(require_tpo),
    db: Session = Depends(get_db),
) -> List[UnplacedStudentInfo]:
    """
    TPO: List of all *verified* but unplaced students.

    Only verified students are included (rejected/pending profiles are excluded)
    so the TPO can focus on students who are actively eligible for placements.
    """
    unplaced_students = (
        db.query(Student)
        .filter(
            Student.is_placed == False,  # noqa: E712
            Student.verification_status == VerificationStatusEnum.verified,
        )
        .order_by(Student.cgpa.desc())
        .all()
    )

    return [
        UnplacedStudentInfo(
            student_id=s.id,
            name=s.name,
            roll_no=s.roll_no,
            branch=s.branch,
            cgpa=s.cgpa,
            backlogs=s.backlogs,
            passing_year=s.passing_year,
        )
        for s in unplaced_students
    ]
