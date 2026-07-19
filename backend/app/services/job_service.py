from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status
from typing import Optional
from app.models.job import JobPosting, InterviewRound, JobStatusEnum, JobTypeEnum
from app.models.student import Student, VerificationStatusEnum
from app.models.notification import Notification
from app.schemas.job import JobCreate, JobUpdate


def create_job(company_id: int, job_data: JobCreate, db: Session):
    """Create a new job posting with interview rounds and notify eligible students."""
    job = JobPosting(
        company_id=company_id,
        title=job_data.title,
        description=job_data.description,
        required_skills=job_data.required_skills,
        min_cgpa=job_data.min_cgpa,
        max_backlogs=job_data.max_backlogs,
        eligible_branches=job_data.eligible_branches,
        package_lpa=job_data.package_lpa,
        job_type=job_data.job_type,
        application_deadline=job_data.application_deadline,
    )
    db.add(job)
    db.flush()  # Get the job.id before adding rounds

    # Create interview rounds with sequential round numbers
    for idx, round_data in enumerate(job_data.rounds, start=1):
        interview_round = InterviewRound(
            job_id=job.id,
            round_number=idx,
            round_name=round_data.round_name,
            scheduled_at=round_data.scheduled_at,
            venue_or_link=round_data.venue_or_link,
            mode=round_data.mode,
            instructions=round_data.instructions,
        )
        db.add(interview_round)

    # Notify eligible students
    eligible_students = _get_eligible_students(job, db)
    for student in eligible_students:
        notification = Notification(
            user_id=student.user_id,
            title="New Job Opportunity",
            message=f"A new {job.job_type.value} role \"{job.title}\" (₹{job.package_lpa} LPA) has been posted. Apply before {job.application_deadline}.",
        )
        db.add(notification)

    db.commit()
    db.refresh(job)
    return job


def get_all_jobs(
    db: Session,
    status_filter: Optional[JobStatusEnum] = None,
    job_type: Optional[JobTypeEnum] = None,
    company_id: Optional[int] = None,
):
    """Get all jobs with optional filters."""
    query = db.query(JobPosting).options(joinedload(JobPosting.company))

    if status_filter:
        query = query.filter(JobPosting.status == status_filter)
    if job_type:
        query = query.filter(JobPosting.job_type == job_type)
    if company_id:
        query = query.filter(JobPosting.company_id == company_id)

    return query.order_by(JobPosting.created_at.desc()).all()


def get_eligible_jobs_for_student(student_id: int, db: Session):
    """Get jobs that a specific student is eligible for based on branch, CGPA, and backlogs."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    query = (
        db.query(JobPosting)
        .options(joinedload(JobPosting.company))
        .filter(
            JobPosting.status == JobStatusEnum.open,
            JobPosting.min_cgpa <= student.cgpa,
            JobPosting.max_backlogs >= student.backlogs,
        )
    )

    # Filter by eligible branches — student's branch must be in the job's eligible_branches list.
    # JSON column filtering varies by DB backend; use a Python-level post-filter for portability.
    jobs = query.order_by(JobPosting.created_at.desc()).all()

    eligible_jobs = [
        job for job in jobs
        if not job.eligible_branches or student.branch in job.eligible_branches
    ]

    return eligible_jobs


def get_job_by_id(job_id: int, db: Session):
    """Get a single job with company info and all interview rounds."""
    job = (
        db.query(JobPosting)
        .options(
            joinedload(JobPosting.company),
            joinedload(JobPosting.rounds),
        )
        .filter(JobPosting.id == job_id)
        .first()
    )
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return job


def update_job(job_id: int, job_data: JobUpdate, company_id: int, db: Session):
    """Update a job posting (status, deadline, description). Only the owning company can update."""
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    if job.company_id != company_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only update your own job postings")

    update_data = job_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(job, key, value)

    db.commit()
    db.refresh(job)
    return job


def delete_job(job_id: int, company_id: Optional[int], db: Session, is_tpo: bool = False):
    """Delete a job posting. The owning company or TPO can delete."""
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    if not is_tpo and job.company_id != company_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only delete your own job postings")

    db.delete(job)
    db.commit()
    return {"detail": "Job deleted successfully"}


# ─── Internal Helpers ──────────────────────────────────────────────

def _get_eligible_students(job: JobPosting, db: Session):
    """Find all verified students eligible for a given job posting."""
    query = db.query(Student).filter(
        Student.verification_status == VerificationStatusEnum.verified,
        Student.cgpa >= job.min_cgpa,
        Student.backlogs <= job.max_backlogs,
    )
    students = query.all()

    if job.eligible_branches:
        students = [s for s in students if s.branch in job.eligible_branches]

    return students
