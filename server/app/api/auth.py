from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session
import re
from pydantic import BaseModel, EmailStr, Field, field_validator

from app.core.security import (
    ALGORITHM,
    SECRET_KEY,
    create_access_token,
    get_password_hash,
    verify_password,
)
from app.db.models import User
from app.db.session import get_db

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()


class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, description="Mindestens 8 Zeichen")
    username: Optional[str] = None

    @field_validator("password")
    @classmethod
    def validate_password_complexity(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Das Passwort muss mindestens 8 Zeichen lang sein.")
        if not re.search(r"\d", v):
            raise ValueError("Das Passwort muss mindestens eine Zahl enthalten.")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>_\-\[\]\\/+=~`]", v):
            raise ValueError("Das Passwort muss mindestens ein Sonderzeichen enthalten.")
        return v

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    username: Optional[str]
    email: EmailStr
    avatar_url: Optional[str]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# --- Dependency für geschützte Routen ---
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    auth_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Ungültiger oder abgelaufener Authentifizierungs-Token.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise auth_exception
    except JWTError:
        raise auth_exception

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise auth_exception
    return user

# --- Endpoints ---

# Kriterium 2: POST /api/auth/register
@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(req: UserRegisterRequest, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == req.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ein Benutzer mit dieser E-Mail-Adresse existiert bereits.",
        )

    resolved_username = req.username or req.email.split("@")[0]
    default_avatar = f"https://api.dicebear.com/7.x/bottts/svg?seed={resolved_username}"

    new_user = User(
        email=req.email,
        username=resolved_username,
        hashed_password=get_password_hash(req.password),
        avatar_url=default_avatar,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(data={"sub": str(new_user.id)})
    return {"access_token": token, "token_type": "bearer", "user": new_user}

# Kriterium 3: POST /api/auth/login
@router.post("/login", response_model=TokenResponse)
def login(req: UserLoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ungültige E-Mail-Adresse oder falsches Passwort.",
        )

    token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer", "user": user}

# Kriterium 4: GET /api/auth/me
@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# --- Zusätzliche Schemas für Profileinstellungen ---
class UserProfileUpdateRequest(BaseModel):
    username: Optional[str] = None
    avatar_url: Optional[str] = None

class UserPasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)

    @field_validator("new_password")
    @classmethod
    def validate_password_complexity(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Das neue Passwort muss mindestens 8 Zeichen lang sein.")
        if not re.search(r"\d", v):
            raise ValueError("Das neue Passwort muss mindestens eine Zahl enthalten.")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>_\-\[\]\\/+=~`]", v):
            raise ValueError("Das neue Passwort muss mindestens ein Sonderzeichen enthalten.")
        return v

# --- Endpoints für Profil- & Passwort-Update ---

@router.put("/profile", response_model=UserResponse)
def update_profile(
    req: UserProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if req.username is not None:
        current_user.username = req.username.strip() or None
    if req.avatar_url is not None:
        current_user.avatar_url = req.avatar_url.strip() or None

    db.commit()
    db.refresh(current_user)
    return current_user

@router.put("/password")
def change_password(
    req: UserPasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(req.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Das aktuelle Passwort ist nicht korrekt.",
        )
    current_user.hashed_password = get_password_hash(req.new_password)
    db.commit()
    return {"message": "Passwort erfolgreich geändert."}