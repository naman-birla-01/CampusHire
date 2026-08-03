from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, students, companies, jobs, applications, ai, notifications, reports
from app.database import engine
from app.models import Base

# Create all tables in the database
Base.metadata.create_all(bind=engine)
app = FastAPI(
    title="CampusHire API",
    description="Placement Management System API with AI Features",
    version="1.0.0"
)

# CORS configuration for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with frontend URL like http://localhost:5173 or Vercel URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(students.router)
app.include_router(companies.router)
app.include_router(jobs.router)
app.include_router(applications.router)
app.include_router(ai.router)
app.include_router(notifications.router)
app.include_router(reports.router)
@app.get("/")
def root():
    return {"message": "Welcome to CampusHire API"}
