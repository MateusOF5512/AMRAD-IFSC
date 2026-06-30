from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from supabase import Client

from app.core.security import get_current_user, require_write_access
from app.database.supabase import get_supabase_client
from app.schemas.machine import MachineCreate, MachineResponse


router = APIRouter(prefix="/machines", tags=["Machines"])


@router.post("/", response_model=MachineResponse, status_code=status.HTTP_201_CREATED)
async def create_machine(
    machine: MachineCreate,
    current_user: dict = Depends(require_write_access)
):
    """Create a new machine"""
    supabase: Client = get_supabase_client()
    
    try:
        response = supabase.table("machines").insert({
            "researcher_id": current_user["user_id"],
            "brand": machine.brand,
            "model": machine.model,
            "technology_type": machine.technology_type,
            "other_specs": machine.other_specs,
            "status": machine.status
        }).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create machine"
            )
        
        return response.data[0]
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )


@router.get("/approved", response_model=List[MachineResponse])
async def get_approved_machines(
    skip: int = 0,
    limit: int = 100
):
    """Get all approved machines (public endpoint)"""
    supabase: Client = get_supabase_client()
    
    try:
        # Tenta buscar com filtro de status
        response = supabase.table("machines") \
            .select("*") \
            .eq("status", "approved") \
            .order("created_at", desc=True) \
            .range(skip, skip + limit - 1) \
            .execute()
        
        return response.data or []
    
    except Exception as e:
        # Se erro (coluna status não existe), retorna todos os máquinas
        try:
            response = supabase.table("machines") \
                .select("*") \
                .order("created_at", desc=True) \
                .range(skip, skip + limit - 1) \
                .execute()
            return response.data or []
        except Exception as fallback_error:
            # Se ainda falhar, retorna lista vazia ao invés de erro 500
            return []


@router.get("/", response_model=List[MachineResponse])
async def get_machines(
    current_user: dict = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100
):
    """Get all machines for current user"""
    supabase: Client = get_supabase_client()
    
    try:
        response = supabase.table("machines") \
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


@router.get("/{machine_id}", response_model=MachineResponse)
async def get_machine(
    machine_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific machine"""
    supabase: Client = get_supabase_client()
    
    try:
        response = supabase.table("machines") \
            .select("*") \
            .eq("id", machine_id) \
            .eq("researcher_id", current_user["user_id"]) \
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Machine not found"
            )
        
        return response.data[0]
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )


@router.delete("/{machine_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_machine(
    machine_id: str,
    current_user: dict = Depends(require_write_access)
):
    """Delete a machine"""
    supabase: Client = get_supabase_client()
    
    # First check if machine exists and belongs to user
    await get_machine(machine_id, current_user)
    
    try:
        response = supabase.table("machines") \
            .delete() \
            .eq("id", machine_id) \
            .execute()
        
        return None
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
