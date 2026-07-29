import os
import pdfplumber
import google.generativeai as genai
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import json

from app.models.student import Student
from app.models.job import JobPosting
from app.models.ai_analysis import AIResumeAnalysis, SkillGapReport

# Configure Gemini AI
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

def extract_text_from_pdf(file_path: str) -> str:
    """Extracts raw text from a PDF resume using pdfplumber."""
    try:
        text = ""
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        return text
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to extract text from PDF: {str(e)}"
        )

def analyze_resume_with_gemini(student_id: int, resume_text: str, db: Session):
    """
    Calls google-generativeai to extract skills and score the resume.
    Saves to AIResumeAnalysis and updates Student.
    """
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Gemini API Key is not configured."
        )

    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    prompt = (
        "Analyze the following resume text. Extract a list of technical skills and provide a resume score from 0 to 100 based on overall quality and experience.\n"
        "Return the response in valid JSON format with exactly two keys: 'skills' (a list of strings) and 'score' (an integer).\n"
        f"Resume text:\n{resume_text}"
    )

    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(prompt)
        
        # Parse the JSON response
        response_text = response.text.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        
        result_json = json.loads(response_text)
        skills = result_json.get("skills", [])
        score = result_json.get("score", 0)

        # Save to AIResumeAnalysis
        ai_analysis = AIResumeAnalysis(
            student_id=student_id,
            resume_text=resume_text,
            extracted_skills=skills,
            resume_score=score
        )
        db.add(ai_analysis)

        # Update student model
        student.extracted_skills = skills
        student.resume_score = score
        db.commit()

        return ai_analysis

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI Analysis failed: {str(e)}"
        )

def generate_skill_gap_report(student_id: int, job_id: int, db: Session):
    """
    Compares student skills with job skills and calls Gemini for gap analysis and a study plan.
    Saves result to SkillGapReport.
    """
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Gemini API Key is not configured."
        )

    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    student_skills = student.extracted_skills or []
    job_skills = job.required_skills or []

    prompt = (
        f"Compare a student's skills with the required skills for a job.\n"
        f"Student Skills: {', '.join(student_skills)}\n"
        f"Job Required Skills: {', '.join(job_skills)}\n\n"
        "Provide a detailed skill gap analysis and a study plan to help the student acquire the missing skills.\n"
        "Return the response in valid JSON format with exactly two keys: 'gap_analysis' (a string) and 'study_plan' (a string)."
    )

    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(prompt)
        
        response_text = response.text.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        
        result_json = json.loads(response_text)
        gap_analysis = result_json.get("gap_analysis", "Analysis failed.")
        study_plan = result_json.get("study_plan", "Plan failed.")

        report = SkillGapReport(
            student_id=student_id,
            job_id=job_id,
            gap_analysis=gap_analysis,
            study_plan=study_plan
        )
        db.add(report)
        db.commit()

        return report

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Skill Gap Report generation failed: {str(e)}"
        )
