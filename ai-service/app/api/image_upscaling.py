"""
Image Upscaling API endpoints
"""
from fastapi import APIRouter, HTTPException, UploadFile, File
import logging
import base64
from typing import List, Dict, Optional

from ..models.schemas import ImageUpscaleRequest, ImageUpscaleResponse
from ..services.image_upscaling import image_upscaling_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/upscale", response_model=ImageUpscaleResponse)
async def upscale_image(request: ImageUpscaleRequest):
    """Upscale an image using AI"""
    try:
        result = await image_upscaling_service.upscale_image(request)
        return result
    except Exception as e:
        logger.error(f"Image upscaling error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upscale-file", response_model=ImageUpscaleResponse)
async def upscale_image_file(
    file: UploadFile = File(...),
    scale: int = 2,
    face_enhance: bool = False,
    denoise: bool = False,
    sharpen: bool = False,
    output_format: str = "PNG"
):
    """Upscale an uploaded image file"""
    try:
        # Read file and convert to base64
        contents = await file.read()
        base64_data = base64.b64encode(contents).decode('utf-8')
        
        # Create request
        request = ImageUpscaleRequest(
            image_data=base64_data,
            scale=scale,
            face_enhance=face_enhance,
            denoise=denoise,
            sharpen=sharpen,
            output_format=output_format
        )
        
        result = await image_upscaling_service.upscale_image(request)
        return result
    except Exception as e:
        logger.error(f"Image upscaling error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/smart-upscale", response_model=ImageUpscaleResponse)
async def smart_upscale_image(
    image_data: str,
    target_width: int,
    target_height: int
):
    """Intelligently upscale to specific dimensions"""
    try:
        result = await image_upscaling_service.smart_upscale(
            image_data,
            target_width,
            target_height
        )
        return result
    except Exception as e:
        logger.error(f"Smart upscaling error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch-upscale")
async def batch_upscale_images(
    images: List[str],
    scale: int = 2,
    options: Optional[Dict] = None
) -> List[ImageUpscaleResponse]:
    """Upscale multiple images in batch"""
    try:
        results = await image_upscaling_service.batch_upscale(
            images,
            scale,
            options
        )
        return results
    except Exception as e:
        logger.error(f"Batch upscaling error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))