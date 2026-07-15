from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.schemas.company import CompanyResponse, CompanyUpdate
from app.services import company_service
from app.services.auth_service import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/companies", tags=["Companies"])

@router.get("/me", response_model=CompanyResponse)
def get_my_company_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "company":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only companies can access this endpoint")
    return company_service.get_company_by_user_id(current_user.id, db)

@router.put("/me", response_model=CompanyResponse)
def update_my_company_profile(data: CompanyUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "company":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only companies can access this endpoint")
    company = company_service.get_company_by_user_id(current_user.id, db)
    return company_service.update_company_profile(company.id, data, db)

@router.get("/", response_model=List[CompanyResponse])
def list_companies(db: Session = Depends(get_db)):
    return company_service.get_all_companies(db)

@router.get("/{company_id}", response_model=CompanyResponse)
def get_company(company_id: int, db: Session = Depends(get_db)):
    return company_service.get_company_by_id(company_id, db)
