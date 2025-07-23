"""
Background Removal API endpoints
"""
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
import logging
import base64

from ..models.schemas import (
    BackgroundRemovalRequest,
    BackgroundRemovalResponse,
    BackgroundGenerationRequest,
    BackgroundGenerationResponse
)
from ..services.background_removal import background_removal_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/remove", response_model=BackgroundRemovalResponse)
async def remove_background(request: BackgroundRemovalRequest):
    """Remove background from an image"""
    try:
        result = await background_removal_service.remove_background(request)
        return result
    except Exception as e:
        logger.error(f"Background removal error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/remove-file", response_model=BackgroundRemovalResponse)
async def remove_background_file(
    file: UploadFile = File(...),
    type: str = "auto",
    edge_refinement: bool = True
):
    """Remove background from uploaded file"""
    try:
        # Read file and convert to base64
        contents = await file.read()
        base64_data = base64.b64encode(contents).decode('utf-8')
        
        # Create request
        request = BackgroundRemovalRequest(
            image_data=base64_data,
            type=type,
            edge_refinement=edge_refinement
        )
        
        result = await background_removal_service.remove_background(request)
        return result
    except Exception as e:
        logger.error(f"Background removal error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/replace", response_model=BackgroundRemovalResponse)
async def replace_background(
    foreground_data: str,
    background_data: str,
    blend_mode: str = "normal",
    opacity: float = 1.0
):
    """Replace background with a new image"""
    try:
        result = await background_removal_service.replace_background(
            foreground_data,
            background_data,
            blend_mode,
            opacity
        )
        return result
    except Exception as e:
        logger.error(f"Background replacement error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate", response_model=BackgroundGenerationResponse)
async def generate_background(request: BackgroundGenerationRequest):
    """Generate AI background for foreground object"""
    try:
        # This would integrate with image generation service
        # For now, return a placeholder
        raise HTTPException(
            status_code=501,
            detail="Background generation not yet implemented"
        )
    except Exception as e:
        logger.error(f"Background generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))