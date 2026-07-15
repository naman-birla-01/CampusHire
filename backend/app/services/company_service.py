from sqlalchemy.orm import Session
from app.models.company import Company
from app.schemas.company import CompanyUpdate
from fastapi import HTTPException, status

def get_company_by_user_id(user_id: int, db: Session):
    company = db.query(Company).filter(Company.user_id == user_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company profile not found")
    return company

def get_all_companies(db: Session):
    return db.query(Company).all()

def get_company_by_id(company_id: int, db: Session):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    return company

def update_company_profile(company_id: int, data: CompanyUpdate, db: Session):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(company, key, value)
        
    db.commit()
    db.refresh(company)
    return company
