from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.student import Student
from app.models.ai_analysis import AIResumeAnalysis, SkillGapReport
from app.middleware.auth import get_current_user
from app.services.ai_service import (
    extract_text_from_pdf,
    analyze_resume_with_gemini,
    generate_skill_gap_report,
)

router = APIRouter(prefix="/api/ai", tags=["AI"])


def _get_student_for_user(current_user: User, db: Session) -> Student:
    """Helper: resolve the Student record for the logged-in student user."""
    if current_user.role != RoleEnum.student:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can access AI features",
        )
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found",
        )
    return student


# ─── GET /api/ai/resume-analysis ───────────────────────────────────
@router.get("/resume-analysis")
def get_resume_analysis(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Student gets their latest AI resume analysis result."""
    student = _get_student_for_user(current_user, db)

    analysis = (
        db.query(AIResumeAnalysis)
        .filter(AIResumeAnalysis.student_id == student.id)
        .order_by(AIResumeAnalysis.id.desc())
        .first()
    )
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No resume analysis found. Please upload your resume first.",
        )

    return {
        "id": analysis.id,
        "student_id": analysis.student_id,
        "extracted_skills": analysis.extracted_skills,
        "resume_score": analysis.resume_score,
    }


# ─── GET /api/ai/skill-gap/{job_id} ───────────────────────────────
@router.get("/skill-gap/{job_id}")
def get_skill_gap(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Student gets (or generates) a skill gap report vs a specific job."""
    student = _get_student_for_user(current_user, db)

    # Check for an existing report first
    report = (
        db.query(SkillGapReport)
        .filter(
            SkillGapReport.student_id == student.id,
            SkillGapReport.job_id == job_id,
        )
        .order_by(SkillGapReport.id.desc())
        .first()
    )

    # Generate one on the fly if none exists
    if not report:
        report = generate_skill_gap_report(student.id, job_id, db)

    return {
        "id": report.id,
        "student_id": report.student_id,
        "job_id": report.job_id,
        "gap_analysis": report.gap_analysis,
        "study_plan": report.study_plan,
    }


# ─── POST /api/ai/analyze ─────────────────────────────────────────
@router.post("/analyze")
def trigger_analysis(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Manually trigger (re-)analysis of the student's current resume."""
    student = _get_student_for_user(current_user, db)

    if not student.resume_path:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No resume uploaded yet. Please upload your resume first.",
        )

    # Extract text from the stored PDF
    resume_text = extract_text_from_pdf(student.resume_path)

    # Run Gemini analysis
    analysis = analyze_resume_with_gemini(student.id, resume_text, db)

    return {
        "message": "Resume analysis completed successfully",
        "id": analysis.id,
        "extracted_skills": analysis.extracted_skills,
        "resume_score": analysis.resume_score,
    }
