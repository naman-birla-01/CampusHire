from pydantic import BaseModel
from typing import Optional

class CompanyBase(BaseModel):
    website: Optional[str] = None
    logo_path: Optional[str] = None
    description: Optional[str] = None
    contact_person: Optional[str] = None
    contact_email: Optional[str] = None

class CompanyUpdate(CompanyBase):
    pass

class CompanyResponse(CompanyBase):
    id: int
    user_id: int
    company_name: str
    industry: Optional[str] = None
    
    class Config:
        from_attributes = True
