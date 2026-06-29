from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import bcrypt
from app.models.user import User, RoleEnum
from app.models.student import Student
from app.models.company import Company
from app.schemas.auth import UserRegister, UserLogin
from app.middleware.auth import create_access_token

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def register_new_user(user_data: UserRegister, db: Session):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    # Create Base User
    hashed_pw = get_password_hash(user_data.password)
    new_user = User(email=user_data.email, password_hash=hashed_pw, role=user_data.role)
    db.add(new_user)
    db.flush() # Get new_user.id

    # Create associated profile
    if user_data.role == RoleEnum.student:
        if not all([user_data.roll_no, user_data.branch, user_data.cgpa, user_data.passing_year]):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Student profile requires roll_no, branch, cgpa, and passing_year")
        
        existing_roll = db.query(Student).filter(Student.roll_no == user_data.roll_no).first()
        if existing_roll:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Roll number already registered")

        student_profile = Student(
            user_id=new_user.id,
            name=user_data.name,
            roll_no=user_data.roll_no,
            branch=user_data.branch,
            cgpa=user_data.cgpa,
            passing_year=user_data.passing_year
        )
        db.add(student_profile)

    elif user_data.role == RoleEnum.company:
        company_profile = Company(
            user_id=new_user.id,
            company_name=user_data.name
        )
        db.add(company_profile)
    elif user_data.role == RoleEnum.tpo:
        # TPO role doesn't have a separate table in this schema, acts as admin
        pass

    db.commit()
    db.refresh(new_user)
    return new_user

def authenticate_user(login_data: UserLogin, db: Session):
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user account")
    
    access_token = create_access_token(data={"sub": user.email, "role": user.role.value})
    return {"access_token": access_token, "token_type": "bearer", "role": user.role.value}

def get_user_profile(user: User, db: Session):
    if user.role == RoleEnum.student:
        student = db.query(Student).filter(Student.user_id == user.id).first()
        return {"id": user.id, "email": user.email, "role": user.role, "name": student.name if student else "Student"}
    elif user.role == RoleEnum.company:
        company = db.query(Company).filter(Company.user_id == user.id).first()
        return {"id": user.id, "email": user.email, "role": user.role, "name": company.company_name if company else "Company"}
    else:
        return {"id": user.id, "email": user.email, "role": user.role, "name": "TPO Admin"}
