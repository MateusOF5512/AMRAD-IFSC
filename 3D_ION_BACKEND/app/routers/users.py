"""
Users Router
Handles user profile management, settings, and profile updates
"""

from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import Optional

from app.database.supabase import get_supabase_client
from app.core.security import CustomHTTPBearer, verify_supabase_token
from app.core.user_roles import researcher_role
from app.core.password import hash_password, verify_password

router = APIRouter(prefix="/users", tags=["Users"])

security_scheme = CustomHTTPBearer()


# ===== SCHEMAS =====

class UserProfileResponse(BaseModel):
    """User profile response"""
    id: str
    name: str
    institution: str
    email: str
    phone_number: str
    instagram: Optional[str] = None
    country: Optional[str] = None
    language: Optional[str] = None
    email_notifications: bool = True
    user_type: str


class UserUpdateRequest(BaseModel):
    """Schema for user profile update"""
    name: Optional[str] = Field(None, min_length=3, max_length=100)
    institution: Optional[str] = Field(None, min_length=3, max_length=100)
    phone_number: Optional[str] = Field(None, min_length=8, max_length=20)
    instagram: Optional[str] = Field(None, max_length=50)
    country: Optional[str] = Field(None, max_length=100)
    language: Optional[str] = Field(None, max_length=50)
    oldPassword: Optional[str] = Field(None)
    newPassword: Optional[str] = Field(None, min_length=8, max_length=100)
    confirmPassword: str = Field(..., description="Current password for confirmation")


class UserSettingsUpdate(BaseModel):
    """Schema for user settings update"""
    email_notifications: Optional[bool] = None
    confirmPassword: str = Field(..., description="Current password for confirmation")


class UpdateResponse(BaseModel):
    """Response for user update"""
    success: bool
    message: str
    data: UserProfileResponse


# ===== HELPER FUNCTIONS =====

def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security_scheme)) -> str:
    """Extract and validate user ID from custom JWT or Supabase OAuth token."""
    user_context = verify_supabase_token(credentials.credentials)
    user_id = user_context.get("user_id")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: user ID not found",
        )

    return user_id


# ===== ENDPOINTS =====

@router.get("/profile", response_model=dict)
async def get_user_profile(
    user_id: str = Depends(get_current_user_id)
):
    """
    Get current user profile
    Requires valid JWT token in Authorization header
    """
    supabase = get_supabase_client()
    
    try:
        # Fetch user from researchers table
        response = supabase.table("researchers").select("*").eq("id", user_id).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        user = response.data[0]
        
        profile_data = UserProfileResponse(
            id=user["id"],
            name=user.get("name", ""),
            institution=user.get("institution", ""),
            email=user.get("email", ""),
            country=user.get("country"),
            language=user.get("language"),
            phone_number=user.get("phone_number", ""),
            instagram=user.get("instagram"),
            email_notifications=user.get("email_notifications", True),
            user_type=researcher_role(user)
        )
        
        return {
            "success": True,
            "data": profile_data.model_dump()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching profile: {str(e)}"
        )


@router.put("/update", response_model=dict)
async def update_user_profile(
    request: UserUpdateRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    Update user profile information
    
    - Validates confirmation password
    - Optionally updates password if oldPassword and newPassword provided
    - Cannot update email (email is immutable)
    - Returns updated user data
    """
    supabase = get_supabase_client()
    
    try:
        # Get current user
        response = supabase.table("researchers").select("password_hash").eq("id", user_id).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        current_user = response.data[0]
        
        # Verify confirmation password
        if not verify_password(request.confirmPassword, current_user.get("password_hash", "")):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid confirmation password"
            )
        
        # Prepare update data
        update_data = {}
        
        if request.name:
            update_data["name"] = request.name.strip()
        
        if request.institution:
            update_data["institution"] = request.institution.strip()
        
        if request.phone_number:
            update_data["phone_number"] = request.phone_number.strip()
        
        
        if request.country is not None:
            update_data["country"] = request.country.strip() if request.country else None
        
        if request.language is not None:
            update_data["language"] = request.language.strip() if request.language else None
        if request.instagram is not None:
            update_data["instagram"] = request.instagram.strip().lower() if request.instagram else None
        
        # Handle password change (only if newPassword is provided)
        # The confirmPassword has already been verified above
        if request.newPassword:
            # Hash new password
            new_hash = hash_password(request.newPassword)
            update_data["password_hash"] = new_hash
        
        # Update user in database
        update_response = supabase.table("researchers").update(update_data).eq("id", user_id).execute()
        
        if not update_response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update user profile"
            )
        
        updated_user = update_response.data[0]
        
        response_data = UserProfileResponse(
            id=updated_user["id"],
            name=updated_user.get("name", ""),
            institution=updated_user.get("institution", ""),
            email=updated_user.get("email", ""),
            phone_number=updated_user.get("phone_number", ""),
            instagram=updated_user.get("instagram"),
            country=updated_user.get("country"),
            language=updated_user.get("language"),
            email_notifications=updated_user.get("email_notifications", True),
            user_type=updated_user.get("user_type", "pesquisador")
        )
        
        return {
            "success": True,
            "message": "Profile updated successfully",
            "data": response_data.model_dump()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating profile: {str(e)}"
        )


@router.put("/settings", response_model=dict)
async def update_user_settings(
    request: UserSettingsUpdate,
    user_id: str = Depends(get_current_user_id)
):
    """
    Update user system settings
    
    - Updates email notification preferences
    - Requires password confirmation
    """
    supabase = get_supabase_client()
    
    try:
        # Get current user
        response = supabase.table("researchers").select("password_hash").eq("id", user_id).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        current_user = response.data[0]
        
        # Verify confirmation password
        if not verify_password(request.confirmPassword, current_user.get("password_hash", "")):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid confirmation password"
            )
        
        # Prepare update data
        update_data = {}
        
        if request.email_notifications is not None:
            update_data["email_notifications"] = request.email_notifications
        
        # Update user in database
        update_response = supabase.table("researchers").update(update_data).eq("id", user_id).execute()
        
        if not update_response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update settings"
            )
        
        updated_user = update_response.data[0]
        
        return {
            "success": True,
            "message": "Settings updated successfully",
            "data": UserProfileResponse(
                id=updated_user["id"],
                name=updated_user.get("name", ""),
                institution=updated_user.get("institution", ""),
                email=updated_user.get("email", ""),
                phone_number=updated_user.get("phone_number", ""),
                instagram=updated_user.get("instagram"),
                country=updated_user.get("country"),
                language=updated_user.get("language"),
                email_notifications=updated_user.get("email_notifications", True),
                user_type=updated_user.get("user_type", "pesquisador")
            )
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating settings: {str(e)}"
        )
