from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status
from typing import Optional
from datetime import date

from app.models.application import (
    Application, RoundResult, Offer,
    ApplicationStatusEnum, ResultEnum, OfferStatusEnum,
)
from app.models.job import JobPosting, InterviewRound, JobStatusEnum
from app.models.student import Student, VerificationStatusEnum
from app.models.notification import Notification
from app.schemas.application import OfferCreate, RoundResultUpdate


# ─── Apply to Job ──────────────────────────────────────────────────

def apply_to_job(student_id: int, job_id: int, db: Session):
    """
    Student applies to a job.
    Checks: job is open, student is verified, student is eligible,
    student hasn't already applied, then calculates AI match score.
    """
    # Fetch student
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    if student.verification_status != VerificationStatusEnum.verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your profile must be verified by the TPO before you can apply",
        )

    if student.is_placed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You have already been placed and cannot apply for more jobs",
        )

    # Fetch job with rounds
    job = (
        db.query(JobPosting)
        .options(joinedload(JobPosting.rounds))
        .filter(JobPosting.id == job_id)
        .first()
    )
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    if job.status != JobStatusEnum.open:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This job is no longer accepting applications")

    if job.application_deadline < date.today():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Application deadline has passed")

    # Eligibility checks
    if student.cgpa < job.min_cgpa:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Minimum CGPA required is {job.min_cgpa}")

    if student.backlogs > job.max_backlogs:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Maximum {job.max_backlogs} backlogs allowed")

    if job.eligible_branches and student.branch not in job.eligible_branches:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Your branch ({student.branch}) is not eligible for this job")

    # Check duplicate application
    existing = db.query(Application).filter(
        Application.student_id == student_id,
        Application.job_id == job_id,
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You have already applied for this job")

    # Calculate AI match score (TF-IDF style skill overlap)
    match_score = _calculate_skill_match_score(student.extracted_skills or [], job.required_skills or [])

    # Create the application
    application = Application(
        student_id=student_id,
        job_id=job_id,
        ai_match_score=match_score,
    )
    db.add(application)
    db.flush()

    # Pre-create RoundResult entries for every interview round (all pending)
    for round_ in sorted(job.rounds, key=lambda r: r.round_number):
        round_result = RoundResult(
            application_id=application.id,
            round_id=round_.id,
        )
        db.add(round_result)

    db.commit()
    db.refresh(application)
    return application


# ─── Read Applications ─────────────────────────────────────────────

def get_applications_for_student(student_id: int, db: Session):
    """Get all applications submitted by a specific student."""
    return (
        db.query(Application)
        .options(
            joinedload(Application.student),
            joinedload(Application.job).joinedload(JobPosting.company),
            joinedload(Application.offer),
        )
        .filter(Application.student_id == student_id)
        .order_by(Application.applied_at.desc())
        .all()
    )


def get_applications_for_job(job_id: int, company_id: int, db: Session):
    """Company views all applicants for one of their jobs, sorted by AI match score desc."""
    # Verify the job belongs to the requesting company
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    if job.company_id != company_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only view applicants for your own jobs")

    return (
        db.query(Application)
        .options(
            joinedload(Application.student),
            joinedload(Application.job).joinedload(JobPosting.company),
            joinedload(Application.offer),
        )
        .filter(Application.job_id == job_id)
        .order_by(Application.ai_match_score.desc().nullslast())
        .all()
    )


def get_all_applications(db: Session):
    """TPO views all applications across every job."""
    return (
        db.query(Application)
        .options(
            joinedload(Application.student),
            joinedload(Application.job).joinedload(JobPosting.company),
            joinedload(Application.offer),
        )
        .order_by(Application.applied_at.desc())
        .all()
    )


def get_application_by_id(application_id: int, db: Session):
    """Get a single application with all nested relations."""
    application = (
        db.query(Application)
        .options(
            joinedload(Application.student),
            joinedload(Application.job).joinedload(JobPosting.company),
            joinedload(Application.job).joinedload(JobPosting.rounds),
            joinedload(Application.round_results).joinedload(RoundResult.round),
            joinedload(Application.offer),
        )
        .filter(Application.id == application_id)
        .first()
    )
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    return application


# ─── Round Results ─────────────────────────────────────────────────

def update_round_result(
    application_id: int,
    round_id: int,
    data: RoundResultUpdate,
    company_id: int,
    db: Session,
):
    """
    Company updates a student's result for a specific interview round.
    On pass: advances current_round. If all rounds passed → status = selected.
    On fail: status = rejected.
    """
    application = (
        db.query(Application)
        .options(
            joinedload(Application.student),
            joinedload(Application.job).joinedload(JobPosting.rounds),
            joinedload(Application.round_results),
        )
        .filter(Application.id == application_id)
        .first()
    )
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    # Verify the job belongs to the requesting company
    if application.job.company_id != company_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only evaluate applicants for your own jobs")

    if application.status == ApplicationStatusEnum.rejected:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot update a rejected application")

    if application.status == ApplicationStatusEnum.selected:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This applicant has already been selected")

    # Find the specific round result
    round_result = next(
        (rr for rr in application.round_results if rr.round_id == round_id),
        None,
    )
    if not round_result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Round result not found for this application")

    # Find the corresponding interview round to get its round_number
    interview_round = db.query(InterviewRound).filter(InterviewRound.id == round_id).first()
    if not interview_round:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview round not found")

    # Update the round result
    round_result.result = data.result
    round_result.feedback = data.feedback

    # Update application status based on result
    total_rounds = len(application.job.rounds)

    if data.result == ResultEnum.fail:
        application.status = ApplicationStatusEnum.rejected
        _notify(
            db,
            user_id=application.student.user_id,
            title="Application Update",
            message=f"Unfortunately, you did not pass round {interview_round.round_number} ({interview_round.round_name}) for \"{application.job.title}\".",
        )

    elif data.result == ResultEnum.pass_:
        # Update current_round to the round that was just passed
        application.current_round = interview_round.round_number
        application.status = ApplicationStatusEnum.in_progress

        if interview_round.round_number >= total_rounds:
            # All rounds passed — mark as shortlisted for offer
            application.status = ApplicationStatusEnum.shortlisted
            _notify(
                db,
                user_id=application.student.user_id,
                title="🎉 All Rounds Cleared!",
                message=f"Congratulations! You have cleared all interview rounds for \"{application.job.title}\". An offer may be issued soon.",
            )
        else:
            next_round_num = interview_round.round_number + 1
            next_round = next(
                (r for r in application.job.rounds if r.round_number == next_round_num),
                None,
            )
            next_round_info = f" Next: {next_round.round_name}." if next_round else ""
            _notify(
                db,
                user_id=application.student.user_id,
                title="Round Cleared",
                message=f"You passed round {interview_round.round_number} ({interview_round.round_name}) for \"{application.job.title}\".{next_round_info}",
            )

    db.commit()
    db.refresh(application)
    return application


# ─── Offers ────────────────────────────────────────────────────────

def issue_offer(application_id: int, offer_data: OfferCreate, company_id: int, db: Session):
    """Company issues a formal offer to a candidate who cleared all rounds."""
    application = (
        db.query(Application)
        .options(
            joinedload(Application.job),
            joinedload(Application.student),
            joinedload(Application.offer),
        )
        .filter(Application.id == application_id)
        .first()
    )
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    if application.job.company_id != company_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only issue offers for your own jobs")

    if application.offer:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An offer has already been issued for this application")

    if application.status not in (ApplicationStatusEnum.shortlisted, ApplicationStatusEnum.in_progress):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot issue offer — application status is '{application.status.value}'. Candidate must clear rounds first.",
        )

    # Create offer
    offer = Offer(
        application_id=application.id,
        offered_package=offer_data.offered_package,
        offer_date=offer_data.offer_date,
    )
    db.add(offer)

    application.status = ApplicationStatusEnum.selected

    _notify(
        db,
        user_id=application.student.user_id,
        title="🎉 Offer Received!",
        message=f"You have received an offer of ₹{offer_data.offered_package} LPA for \"{application.job.title}\". Please respond to accept or decline.",
    )

    db.commit()
    db.refresh(application)
    return application


def respond_to_offer(application_id: int, response: OfferStatusEnum, student_id: int, db: Session):
    """Student accepts or declines an offer."""
    application = (
        db.query(Application)
        .options(
            joinedload(Application.offer),
            joinedload(Application.job).joinedload(JobPosting.company),
            joinedload(Application.student),
        )
        .filter(Application.id == application_id)
        .first()
    )
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    if application.student_id != student_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only respond to your own offers")

    if not application.offer:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No offer has been issued for this application")

    if application.offer.status != OfferStatusEnum.pending:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You have already responded to this offer")

    application.offer.status = response

    if response == OfferStatusEnum.accepted:
        # Mark student as placed
        student = application.student
        student.is_placed = True
        student.placed_package = application.offer.offered_package

        _notify(
            db,
            user_id=application.job.company.user_id,
            title="Offer Accepted",
            message=f"{student.name} (Roll No: {student.roll_no}) has accepted the offer for \"{application.job.title}\".",
        )

    elif response == OfferStatusEnum.declined:
        application.status = ApplicationStatusEnum.rejected

        _notify(
            db,
            user_id=application.job.company.user_id,
            title="Offer Declined",
            message=f"{application.student.name} (Roll No: {application.student.roll_no}) has declined the offer for \"{application.job.title}\".",
        )

    db.commit()
    db.refresh(application)
    return application


# ─── Internal Helpers ──────────────────────────────────────────────

def _calculate_skill_match_score(student_skills: list, job_skills: list) -> float:
    """
    Calculate a TF-IDF-inspired skill match score between a student and a job.
    Returns a percentage (0.0 – 100.0) based on normalized skill overlap.
    """
    if not job_skills:
        return 100.0  # No skills required — perfect match

    if not student_skills:
        return 0.0

    # Normalize to lowercase for comparison
    student_set = {s.strip().lower() for s in student_skills}
    job_set = {s.strip().lower() for s in job_skills}

    matched = student_set & job_set
    score = (len(matched) / len(job_set)) * 100.0

    return round(score, 2)


def _notify(db: Session, user_id: int, title: str, message: str):
    """Internal helper to create a notification."""
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
    )
    db.add(notification)
