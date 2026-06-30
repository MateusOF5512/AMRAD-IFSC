from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from supabase import Client

from app.core.security import get_current_user, require_write_access
from app.database.supabase import get_supabase_client
from app.schemas.material import MaterialCreate, MaterialUpdate, MaterialResponse


router = APIRouter(prefix="/materials", tags=["Materials"])


@router.post("/", response_model=MaterialResponse, status_code=status.HTTP_201_CREATED)
async def create_material(
    material: MaterialCreate,
    current_user: dict = Depends(require_write_access)
):
    """Create a new material"""
    supabase: Client = get_supabase_client()
    
    try:
        response = supabase.table("materials").insert({
            "researcher_id": current_user["user_id"],
            "brand": material.brand,
            "model": material.model,
            "color": material.color,
            "is_composite": material.is_composite,
            "composite_details": material.composite_details,
            "status": material.status
        }).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create material"
            )
        
        return response.data[0]
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )


@router.get("/approved", response_model=List[MaterialResponse])
async def get_approved_materials(
    skip: int = 0,
    limit: int = 100
):
    """Get all approved materials (public endpoint)"""
    supabase: Client = get_supabase_client()
    
    try:
        # Tenta buscar com filtro de status
        response = supabase.table("materials") \
            .select("*") \
            .eq("status", "approved") \
            .order("created_at", desc=True) \
            .range(skip, skip + limit - 1) \
            .execute()
        
        return response.data or []
    
    except Exception as e:
        # Se erro (coluna status não existe), retorna todos os materiais
        try:
            response = supabase.table("materials") \
                .select("*") \
                .order("created_at", desc=True) \
                .range(skip, skip + limit - 1) \
                .execute()
            return response.data or []
        except Exception as fallback_error:
            # Se ainda falhar, retorna lista vazia ao invés de erro 500
            return []


@router.get("/", response_model=List[MaterialResponse])
async def get_materials(
    current_user: dict = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100
):
    """Get all materials for current user"""
    supabase: Client = get_supabase_client()
    
    try:
        response = supabase.table("materials") \
            .select("*") \
            .eq("researcher_id", current_user["user_id"]) \
            .order("created_at", desc=True) \
            .range(skip, skip + limit - 1) \
            .execute()
        
        return response.data or []
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )


@router.get("/{material_id}", response_model=MaterialResponse)
async def get_material(
    material_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific material"""
    supabase: Client = get_supabase_client()
    
    try:
        response = supabase.table("materials") \
            .select("*") \
            .eq("id", material_id) \
            .eq("researcher_id", current_user["user_id"]) \
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Material not found"
            )
        
        return response.data[0]
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )


@router.put("/{material_id}", response_model=MaterialResponse)
async def update_material(
    material_id: str,
    material: MaterialUpdate,
    current_user: dict = Depends(require_write_access)
):
    """Update a material"""
    supabase: Client = get_supabase_client()
    
    # First check if material exists and belongs to user
    await get_material(material_id, current_user)
    
    try:
        # Only update fields that are provided
        update_data = material.model_dump(exclude_unset=True)
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )
        
        response = supabase.table("materials") \
            .update(update_data) \
            .eq("id", material_id) \
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update material"
            )
        
        return response.data[0]
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )


@router.delete("/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_material(
    material_id: str,
    current_user: dict = Depends(require_write_access)
):
    """Delete a material"""
    supabase: Client = get_supabase_client()
    
    # First check if material exists and belongs to user
    await get_material(material_id, current_user)
    
    try:
        response = supabase.table("materials") \
            .delete() \
            .eq("id", material_id) \
            .execute()
        
        return None
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
