"""
Image Generation API endpoints
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.responses import JSONResponse
import logging
from typing import Optional
import uuid

from ..models.schemas import (
    ImageGenerationRequest,
    ImageGenerationResponse,
    BatchRequest,
    BatchResponse
)
from ..services.image_generation import image_generation_service
from ..utils.cache import set_job_status, get_job_status

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/generate", response_model=ImageGenerationResponse)
async def generate_images(request: ImageGenerationRequest):
    """Generate images using AI"""
    try:
        result = await image_generation_service.generate_images(request)
        return result
    except Exception as e:
        logger.error(f"Image generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/variations", response_model=ImageGenerationResponse)
async def generate_variations(
    image_url: str,
    num_variations: int = 4
):
    """Generate variations of an existing image"""
    try:
        result = await image_generation_service.generate_variations(
            image_url, 
            num_variations
        )
        return result
    except Exception as e:
        logger.error(f"Variation generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch", response_model=BatchResponse)
async def batch_generate(
    request: BatchRequest,
    background_tasks: BackgroundTasks
):
    """Batch generate multiple images"""
    try:
        job_id = str(uuid.uuid4())
        
        # Initial job status
        await set_job_status(job_id, {
            "status": "processing",
            "total": len(request.items),
            "completed": 0,
            "failed": 0
        })
        
        # Process in background
        background_tasks.add_task(
            process_batch_generation,
            job_id,
            request.items,
            request.options
        )
        
        return BatchResponse(
            job_id=job_id,
            total_items=len(request.items),
            completed_items=0,
            failed_items=0,
            results=[],
            status="processing",
            created_at=datetime.utcnow()
        )
    except Exception as e:
        logger.error(f"Batch generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/batch/{job_id}", response_model=BatchResponse)
async def get_batch_status(job_id: str):
    """Get batch job status"""
    try:
        status = await get_job_status(job_id)
        if not status:
            raise HTTPException(status_code=404, detail="Job not found")
        
        return JSONResponse(content=status)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting job status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


async def process_batch_generation(job_id: str, items: list, options: dict):
    """Process batch generation in background"""
    completed = 0
    failed = 0
    results = []
    
    for i, item in enumerate(items):
        try:
            # Create request from item
            gen_request = ImageGenerationRequest(**item)
            result = await image_generation_service.generate_images(gen_request)
            
            results.append({
                "index": i,
                "success": True,
                "result": result.dict()
            })
            completed += 1
        except Exception as e:
            results.append({
                "index": i,
                "success": False,
                "error": str(e)
            })
            failed += 1
        
        # Update job status
        await set_job_status(job_id, {
            "status": "processing",
            "total": len(items),
            "completed": completed,
            "failed": failed,
            "results": results
        })
    
    # Final status
    await set_job_status(job_id, {
        "status": "completed",
        "total": len(items),
        "completed": completed,
        "failed": failed,
        "results": results,
        "completed_at": datetime.utcnow().isoformat()
    }, ttl=86400)  # Keep for 24 hours