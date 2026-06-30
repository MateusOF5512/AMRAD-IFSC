"""
Authentication Router
Handles user registration and login using the researchers table
"""

from fastapi import APIRouter, HTTPException, status, Depends, Request
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from supabase import Client

from app.database.supabase import get_supabase_client
from app.core.security import (
    create_access_token,
    get_current_user,
    security_scheme,
    verify_supabase_token,
)
from app.core.user_roles import researcher_role
from app.core.user_status import REGULAR_STATUS, ensure_account_is_active, normalize_user_status
from app.core.password import hash_password, verify_password
from app.core.rate_limit import check_rate_limit
from app.core.oauth import (
    create_oauth_researcher,
    find_researcher_by_auth,
    get_researcher_by_id,
    get_supabase_auth_user,
    google_display_name,
    link_auth_id,
    researcher_to_login_payload,
)
from fastapi.security import HTTPAuthorizationCredentials

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ===== SCHEMAS =====

class RegisterRequest(BaseModel):
    """Schema for user registration"""
    name: str = Field(..., min_length=3, max_length=100)
    institution: str = Field(..., min_length=3, max_length=100)
    email: EmailStr
    phone_number: str = Field(..., min_length=8, max_length=20)
    password: str = Field(..., min_length=8, max_length=100)
    instagram: Optional[str] = Field(None, max_length=50)
    country: Optional[str] = Field(None, max_length=100)
    language: Optional[str] = Field(None, max_length=50)


class LoginRequest(BaseModel):
    """Schema for user login"""
    email_or_instagram: str = Field(..., description="Email or Instagram handle")
    password: str = Field(...)


class RegisterResponse(BaseModel):
    """Schema for registration response"""
    id: str
    name: str
    email: str
    message: str


class LoginResponse(BaseModel):
    """Schema for login response"""
    user_id: str
    id: str
    name: str
    email: str
    institution: Optional[str] = None
    phone_number: Optional[str] = None
    instagram: Optional[str] = None
    country: Optional[str] = None
    language: Optional[str] = None
    user_type: str
    status: str = REGULAR_STATUS
    needs_profile_completion: bool = False
    message: str
    access_token: str


class ChangePasswordRequest(BaseModel):
    """Schema for authenticated password change"""
    old_password: str = Field(..., min_length=8, max_length=100)
    new_password: str = Field(..., min_length=8, max_length=100)


class OAuthCompleteProfileRequest(BaseModel):
    """Optional researcher details after Google sign-in"""
    institution: Optional[str] = Field(None, max_length=100)
    phone_number: Optional[str] = Field(None, max_length=20)
    instagram: Optional[str] = Field(None, max_length=50)
    country: Optional[str] = Field(None, max_length=100)
    language: Optional[str] = Field(None, max_length=50)


class OAuthProfileStatusResponse(BaseModel):
    """Whether the Google account already has a researcher profile"""
    has_profile: bool
    email: Optional[str] = None
    name: Optional[str] = None


# ===== HELPER FUNCTIONS =====

def _login_response_for_researcher(
    researcher: dict,
    *,
    profile_completion_pending: bool | None = None,
) -> LoginResponse:
    """Issue a backend JWT for API calls (stable 24h token, independent of Supabase session)."""
    access_token = create_access_token(
        user_id=researcher["id"],
        user_email=researcher["email"],
        user_type=researcher_role(researcher),
    )
    payload = researcher_to_login_payload(
        researcher,
        access_token,
        profile_completion_pending=profile_completion_pending,
    )
    return LoginResponse(**payload)


def normalize_data(data: dict) -> dict:
    """Normalize user data: strip and lowercase where appropriate"""
    return {
        "name": data.get("name", "").strip(),
        "institution": data.get("institution", "").strip(),
        "email": data.get("email", "").strip().lower(),
        "phone_number": data.get("phone_number", "").strip(),
        "instagram": data.get("instagram", "").strip().lower() if data.get("instagram") else None,
        "password": data.get("password", "").strip(),
    }


# ===== ENDPOINTS =====

@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest, http_request: Request):
    """
    Register a new researcher
    
    - Validates email format
    - Hashes password using bcrypt
    - Stores in researchers table
    - Returns user data (without password hash)
    """
    supabase = get_supabase_client()
    check_rate_limit(http_request)

    try:
        # Normalize data
        normalized = normalize_data(request.dict())
        
        # Validate phone number
        if not normalized["phone_number"].isdigit():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phone number must contain only digits"
            )
        
        # Check if email already exists
        existing = supabase.table("researchers").select("id").eq("email", normalized["email"]).execute()
        if existing.data:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered"
            )
        
        # Check if Instagram already exists (if provided)
        if normalized["instagram"]:
            existing_ig = supabase.table("researchers").select("id").eq("instagram", normalized["instagram"]).execute()
            if existing_ig.data:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Instagram handle already registered"
                )
        
        # Hash password
        password_hash = hash_password(normalized["password"])
        
        # Prepare data for insertion
        new_user = {
            "name": normalized["name"],
            "institution": normalized["institution"],
            "email": normalized["email"],
            "phone_number": normalized["phone_number"],
            "instagram": normalized["instagram"],
            "country": request.country,
            "language": request.language,
            "password_hash": password_hash,
            "user_type": "pesquisador",
            "status": REGULAR_STATUS,
        }
        
        # Insert into researchers table
        response = supabase.table("researchers").insert(new_user).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user"
            )
        
        user_data = response.data[0]
        
        return RegisterResponse(
            id=user_data["id"],
            name=user_data["name"],
            email=user_data["email"],
            message="User registered successfully. You can now login."
        )
        
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error during registration",
        )


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, http_request: Request):
    """
    Login user with email or Instagram
    
    - Accepts email or Instagram handle
    - Verifies password against bcrypt hash
    - Returns user data and JWT token
    """
    supabase = get_supabase_client()
    check_rate_limit(http_request)
    
    try:
        # Normalize input
        email_or_ig = request.email_or_instagram.strip().lower()
        password = request.password.strip()
        
        user_data = None
        
        # Try to find by email first
        response = supabase.table("researchers") \
            .select("*") \
            .eq("email", email_or_ig) \
            .execute()
        
        if response.data:
            user_data = response.data[0]
        else:
            # If not found by email, try by Instagram
            response = supabase.table("researchers") \
                .select("*") \
                .eq("instagram", email_or_ig) \
                .execute()
            
            if response.data:
                user_data = response.data[0]
        
        # User not found
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email/Instagram or password"
            )
        
        stored_hash = user_data.get("password_hash")
        
        if not stored_hash:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User does not have a password set"
            )
        
        # Verify password
        if not verify_password(password, stored_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email/Instagram or password"
            )

        account_status = normalize_user_status(user_data.get("status"))
        if account_status == "desativado":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Conta desativada. Entre em contato com o administrador.",
            )
        
        # Generate JWT token
        access_token = create_access_token(
            user_id=user_data["id"],
            user_email=user_data["email"],
            user_type=user_data.get("user_type", "pesquisador")
        )
        
        return LoginResponse(
            user_id=user_data["id"],
            id=user_data["id"],
            name=user_data["name"],
            email=user_data["email"],
            institution=user_data.get("institution"),
            phone_number=user_data.get("phone_number"),
            instagram=user_data.get("instagram"),
            country=user_data.get("country"),
            language=user_data.get("language"),
            user_type=user_data.get("user_type", "pesquisador"),
            status=account_status,
            message=f"Welcome, {user_data['name']}!",
            access_token=access_token
        )
        
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error during login",
        )


@router.get("/oauth/profile-status", response_model=OAuthProfileStatusResponse)
async def oauth_profile_status(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
):
    """Check if the authenticated Google user already has a researcher profile."""
    auth_user = get_supabase_auth_user(credentials.credentials)
    supabase = get_supabase_client()
    researcher = find_researcher_by_auth(supabase, auth_user.id, auth_user.email)

    return OAuthProfileStatusResponse(
        has_profile=researcher is not None,
        email=auth_user.email,
        name=(auth_user.user_metadata or {}).get("full_name")
        or (auth_user.user_metadata or {}).get("name")
        or auth_user.email,
    )


@router.post("/oauth/session", response_model=LoginResponse)
async def oauth_session(
    http_request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
):
    """
    Sync a researcher profile with a Supabase Google session.
    Auto-provisions new Google users with name and email from the provider.
    """
    check_rate_limit(http_request)
    supabase = get_supabase_client()
    auth_user = get_supabase_auth_user(credentials.credentials)
    researcher = find_researcher_by_auth(supabase, auth_user.id, auth_user.email)

    if not researcher:
        researcher = create_oauth_researcher(supabase, auth_user)
    elif not researcher.get("auth_id"):
        link_auth_id(supabase, researcher["id"], auth_user.id)
        researcher["auth_id"] = auth_user.id

    google_name = google_display_name(auth_user)
    if google_name and researcher.get("name") != google_name:
        supabase.table("researchers").update({"name": google_name}).eq(
            "id", researcher["id"]
        ).execute()
        researcher["name"] = google_name

    fresh_researcher = get_researcher_by_id(supabase, researcher["id"]) or researcher
    ensure_account_is_active(
        {"user_type": fresh_researcher.get("user_type"), "status": fresh_researcher.get("status")}
    )
    return _login_response_for_researcher(fresh_researcher)


@router.get("/me", response_model=LoginResponse)
async def get_current_session(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
):
    """Return the authenticated user profile with user_type and status from the database."""
    supabase = get_supabase_client()
    user_context = verify_supabase_token(credentials.credentials)
    user_id = user_context.get("user_id")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Não autenticado",
        )

    fresh_researcher = get_researcher_by_id(supabase, user_id)
    if not fresh_researcher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Researcher profile not found",
        )

    ensure_account_is_active(
        {"user_type": fresh_researcher.get("user_type"), "status": fresh_researcher.get("status")}
    )
    return _login_response_for_researcher(fresh_researcher)


@router.post("/refresh", response_model=LoginResponse)
async def refresh_session(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
):
    """Return a fresh backend JWT for an authenticated user (custom JWT or Supabase token)."""
    supabase = get_supabase_client()
    user_context = verify_supabase_token(credentials.credentials)
    user_id = user_context.get("user_id")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Não autenticado",
        )

    fresh_researcher = get_researcher_by_id(supabase, user_id)
    if not fresh_researcher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Researcher profile not found",
        )

    ensure_account_is_active(
        {"user_type": fresh_researcher.get("user_type"), "status": fresh_researcher.get("status")}
    )
    return _login_response_for_researcher(fresh_researcher)


@router.post("/oauth/complete-profile", response_model=LoginResponse)
async def oauth_complete_profile(
    request: OAuthCompleteProfileRequest,
    http_request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
):
    """Save optional researcher details after Google sign-in."""
    check_rate_limit(http_request)
    supabase = get_supabase_client()
    auth_user = get_supabase_auth_user(credentials.credentials)
    researcher = find_researcher_by_auth(supabase, auth_user.id, auth_user.email)

    if not researcher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Researcher profile not found",
        )

    updates: dict = {"profile_onboarding_completed": True}

    if request.institution is not None:
        institution = request.institution.strip()
        if institution:
            updates["institution"] = institution

    if request.phone_number is not None:
        phone_number = request.phone_number.strip()
        if phone_number:
            if not phone_number.isdigit() or len(phone_number) < 8:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Phone number must contain only digits (minimum 8)",
                )
            updates["phone_number"] = phone_number

    if request.instagram is not None:
        instagram = request.instagram.strip().lower()
        if instagram:
            existing_ig = (
                supabase.table("researchers")
                .select("id")
                .eq("instagram", instagram)
                .neq("id", researcher["id"])
                .execute()
            )
            if existing_ig.data:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Instagram handle already registered",
                )
            updates["instagram"] = instagram

    if request.country is not None:
        country = request.country.strip()
        if country:
            updates["country"] = country

    if request.language is not None:
        language = request.language.strip()
        if language:
            updates["language"] = language

    response = (
        supabase.table("researchers")
        .update(updates)
        .eq("id", researcher["id"])
        .execute()
    )
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile",
        )

    return _login_response_for_researcher(
        response.data[0],
        profile_completion_pending=False,
    )


@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    http_request: Request,
    current_user: dict = Depends(get_current_user),
):
    """
    Change password for the authenticated user.
    """
    check_rate_limit(http_request)
    supabase = get_supabase_client()
    user_id = current_user["user_id"]

    try:
        user = supabase.table("researchers").select("password_hash").eq("id", user_id).execute()

        if not user.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        stored_hash = user.data[0].get("password_hash")
        if not stored_hash:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password change is not available for Google sign-in accounts",
            )
        if not verify_password(request.old_password, stored_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current password is incorrect",
            )

        new_hash = hash_password(request.new_password)
        supabase.table("researchers").update({"password_hash": new_hash}).eq("id", user_id).execute()

        return {"message": "Password changed successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error changing password",
        )
