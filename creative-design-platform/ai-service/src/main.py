"""
AI Service Main Application
FastAPI server for Creative Design Platform AI features
"""
import asyncio
import time
from contextlib import asynccontextmanager
from typing import Dict, Any

import structlog
import uvicorn
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .models.schemas import (
    HealthResponse,
    ErrorResponse,
    ImageGenerationRequest,
    ImageGenerationResponse,
    BackgroundRemovalRequest,
    BackgroundRemovalResponse,
    BackgroundGenerationRequest,
    BackgroundGenerationResponse,
    ObjectRemovalRequest,
    ObjectRemovalResponse,
    TextGenerationRequest,
    TextGenerationResponse,
    TranslationRequest,
    TranslationResponse,
    JobStatus
)
from .services.base import rate_limiter, job_tracker
from .services.image_generation import image_generation_service
from .services.background_removal import background_removal_service
from .services.text_generation import text_generation_service
from .services.magic_animator import magic_animator_service

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Application startup time
startup_time = time.time()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    # Startup
    logger.info("Starting AI Service", version="1.0.0", environment=settings.environment)
    
    try:
        # Initialize services
        await image_generation_service.initialize()
        await background_removal_service.initialize()
        await text_generation_service.initialize()
        await magic_animator_service.initialize()
        logger.info("All services initialized successfully")
        
        yield
        
    except Exception as e:
        logger.error("Failed to initialize services", error=str(e))
        raise
    finally:
        # Shutdown
        logger.info("Shutting down AI Service")
        await image_generation_service.close()
        await background_removal_service.close()
        await text_generation_service.close()
        await magic_animator_service.close()


# Create FastAPI application
app = FastAPI(
    title="Creative Design Platform - AI Service",
    description="AI-powered features for creative design automation",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)


# Dependency for rate limiting
async def check_rate_limit(request):
    """Rate limiting dependency"""
    client_ip = request.client.host
    if not await rate_limiter.check_rate_limit(client_ip):
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please try again later."
        )


# Exception handlers
@app.exception_handler(ValueError)
async def value_error_handler(request, exc):
    return JSONResponse(
        status_code=400,
        content=ErrorResponse(
            error=str(exc),
            error_code="VALIDATION_ERROR"
        ).dict()
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error("Unhandled exception", error=str(exc), path=request.url.path)
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error="Internal server error",
            error_code="INTERNAL_ERROR"
        ).dict()
    )


# Health check endpoint
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    try:
        # Check service dependencies
        dependencies = {
            "image_generation": await image_generation_service.health_check(),
            "background_removal": await background_removal_service.health_check(),
            "text_generation": await text_generation_service.health_check(),
            "magic_animator": await magic_animator_service.health_check(),
        }
        
        status = "healthy" if all(dependencies.values()) else "unhealthy"
        uptime = time.time() - startup_time
        
        return HealthResponse(
            status=status,
            version="1.0.0",
            uptime=uptime,
            dependencies=dependencies
        )
    except Exception as e:
        logger.error("Health check failed", error=str(e))
        raise HTTPException(status_code=503, detail="Service unhealthy")


# Image Generation Endpoints
@app.post("/api/v1/generate/images", response_model=ImageGenerationResponse)
async def generate_images(
    request: ImageGenerationRequest,
    _: None = Depends(check_rate_limit)
):
    """Generate AI images using Stable Diffusion"""
    try:
        logger.info(
            "Image generation request",
            prompt=request.prompt,
            style=request.style.value,
            batch_size=request.batch_size
        )
        
        response = await image_generation_service.generate_images(request)
        
        logger.info(
            "Image generation completed",
            job_id=response.job_id,
            image_count=len(response.images)
        )
        
        return response
        
    except ValueError as e:
        logger.warning("Invalid image generation request", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Image generation failed", error=str(e))
        raise HTTPException(status_code=500, detail="Image generation failed")


# Background Processing Endpoints
@app.post("/api/v1/process/remove-background", response_model=BackgroundRemovalResponse)
async def remove_background(
    request: BackgroundRemovalRequest,
    _: None = Depends(check_rate_limit)
):
    """Remove background from image using AI"""
    try:
        logger.info(
            "Background removal request",
            image_url=request.image_url,
            edge_refinement=request.edge_refinement
        )
        
        response = await background_removal_service.remove_background(request)
        
        logger.info(
            "Background removal completed",
            job_id=response.job_id
        )
        
        return response
        
    except ValueError as e:
        logger.warning("Invalid background removal request", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Background removal failed", error=str(e))
        raise HTTPException(status_code=500, detail="Background removal failed")


@app.post("/api/v1/process/generate-background", response_model=BackgroundGenerationResponse)
async def generate_background(
    request: BackgroundGenerationRequest,
    _: None = Depends(check_rate_limit)
):
    """Generate new background for subject image"""
    try:
        logger.info(
            "Background generation request",
            subject_url=request.subject_image_url,
            style_prompt=request.style_prompt
        )
        
        response = await background_removal_service.generate_background(request)
        
        logger.info(
            "Background generation completed",
            job_id=response.job_id
        )
        
        return response
        
    except ValueError as e:
        logger.warning("Invalid background generation request", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Background generation failed", error=str(e))
        raise HTTPException(status_code=500, detail="Background generation failed")


@app.post("/api/v1/process/remove-object", response_model=ObjectRemovalResponse)
async def remove_object(
    request: ObjectRemovalRequest,
    _: None = Depends(check_rate_limit)
):
    """Remove object from image using AI inpainting"""
    try:
        logger.info(
            "Object removal request",
            image_url=request.image_url,
            mask_points=len(request.mask_coordinates)
        )
        
        response = await background_removal_service.remove_object(request)
        
        logger.info(
            "Object removal completed",
            job_id=response.job_id,
            mask_area=response.mask_area
        )
        
        return response
        
    except ValueError as e:
        logger.warning("Invalid object removal request", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Object removal failed", error=str(e))
        raise HTTPException(status_code=500, detail="Object removal failed")


# Text Generation Endpoints
@app.post("/api/v1/generate/text", response_model=TextGenerationResponse)
async def generate_text(
    request: TextGenerationRequest,
    _: None = Depends(check_rate_limit)
):
    """Generate AI text using GPT-4"""
    try:
        logger.info(
            "Text generation request",
            context=request.context[:100],  # Log first 100 chars
            tone=request.tone.value,
            format_type=request.format_type,
            variation_count=request.variation_count
        )
        
        response = await text_generation_service.generate_text(request)
        
        logger.info(
            "Text generation completed",
            job_id=response.job_id,
            variation_count=len(response.variations)
        )
        
        return response
        
    except ValueError as e:
        logger.warning("Invalid text generation request", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Text generation failed", error=str(e))
        raise HTTPException(status_code=500, detail="Text generation failed")


@app.post("/api/v1/translate", response_model=TranslationResponse)
async def translate_text(
    request: TranslationRequest,
    _: None = Depends(check_rate_limit)
):
    """Translate text using DeepL API"""
    try:
        logger.info(
            "Translation request",
            source_language=request.source_language,
            target_language=request.target_language,
            text_length=len(request.text)
        )
        
        response = await text_generation_service.translate_text(request)
        
        logger.info(
            "Translation completed",
            job_id=response.job_id,
            detected_language=response.source_language
        )
        
        return response
        
    except ValueError as e:
        logger.warning("Invalid translation request", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Translation failed", error=str(e))
        raise HTTPException(status_code=500, detail="Translation failed")


# Job Status Endpoint
@app.get("/api/v1/jobs/{job_id}", response_model=JobStatus)
async def get_job_status(job_id: str):
    """Get the status of an AI job"""
    job = job_tracker.get_job(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return JobStatus(**job)


# Magic Animator Endpoints
@app.post("/api/v1/animate/smart-generate")
async def generate_smart_animations(
    request: Dict[str, Any],
    _: None = Depends(check_rate_limit)
):
    """Generate AI-powered animations for design elements"""
    try:
        logger.info(
            "Smart animation generation request",
            element_count=len(request.get("design_elements", [])),
            style=request.get("style", "unknown"),
            purpose=request.get("purpose", "unknown")
        )
        
        # Extract and validate request parameters
        design_elements = request.get("design_elements", [])
        style = request.get("style", "professional")
        purpose = request.get("purpose", "engagement")
        duration = request.get("duration_seconds", 5.0)
        context = request.get("context")
        
        response = await magic_animator_service.generate_smart_animations(
            design_elements=design_elements,
            style=style,
            purpose=purpose,
            duration_seconds=duration,
            context=context
        )
        
        logger.info(
            "Smart animation generation completed",
            job_id=response["job_id"],
            animation_count=len(response["animations"])
        )
        
        return response
        
    except ValueError as e:
        logger.warning("Invalid animation generation request", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Animation generation failed", error=str(e))
        raise HTTPException(status_code=500, detail="Animation generation failed")


@app.post("/api/v1/animate/optimize")
async def optimize_animations(
    request: Dict[str, Any],
    _: None = Depends(check_rate_limit)
):
    """Optimize existing animations using AI analysis"""
    try:
        logger.info(
            "Animation optimization request",
            animation_count=len(request.get("current_animations", [])),
            goals=request.get("performance_goals", {})
        )
        
        current_animations = request.get("current_animations", [])
        performance_goals = request.get("performance_goals", {})
        context = request.get("context")
        
        response = await magic_animator_service.optimize_existing_animations(
            current_animations=current_animations,
            performance_goals=performance_goals,
            context=context
        )
        
        logger.info(
            "Animation optimization completed",
            job_id=response["job_id"],
            improvement_score=response.get("improvement_metrics", {}).get("performance_improvement", 0)
        )
        
        return response
        
    except ValueError as e:
        logger.warning("Invalid animation optimization request", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Animation optimization failed", error=str(e))
        raise HTTPException(status_code=500, detail="Animation optimization failed")


@app.post("/api/v1/animate/variations")
async def generate_animation_variations(
    request: Dict[str, Any],
    _: None = Depends(check_rate_limit)
):
    """Generate creative variations of a base animation"""
    try:
        logger.info(
            "Animation variations request",
            base_animation=request.get("base_animation", {}).get("name", "unknown"),
            variation_count=request.get("variation_count", 5)
        )
        
        base_animation = request.get("base_animation", {})
        variation_count = request.get("variation_count", 5)
        creativity_level = request.get("creativity_level", 0.7)
        
        response = await magic_animator_service.suggest_animation_variations(
            base_animation=base_animation,
            variation_count=variation_count,
            creativity_level=creativity_level
        )
        
        logger.info(
            "Animation variations completed",
            variation_count=len(response),
            avg_effectiveness=sum(v["effectiveness_score"] for v in response) / len(response) if response else 0
        )
        
        return {
            "variations": response,
            "total_generated": len(response)
        }
        
    except ValueError as e:
        logger.warning("Invalid animation variations request", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Animation variations generation failed", error=str(e))
        raise HTTPException(status_code=500, detail="Animation variations generation failed")


@app.post("/api/v1/animate/contextual-presets")
async def generate_contextual_presets(
    request: Dict[str, Any],
    _: None = Depends(check_rate_limit)
):
    """Generate animation presets tailored to specific context"""
    try:
        logger.info(
            "Contextual presets request",
            industry=request.get("industry", "unknown"),
            content_type=request.get("content_type", "unknown")
        )
        
        industry = request.get("industry", "general")
        brand_personality = request.get("brand_personality", [])
        target_audience = request.get("target_audience", {})
        content_type = request.get("content_type", "advertisement")
        
        response = await magic_animator_service.generate_contextual_presets(
            industry=industry,
            brand_personality=brand_personality,
            target_audience=target_audience,
            content_type=content_type
        )
        
        logger.info(
            "Contextual presets completed",
            job_id=response["job_id"],
            preset_count=len(response["presets"])
        )
        
        return response
        
    except ValueError as e:
        logger.warning("Invalid contextual presets request", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Contextual presets generation failed", error=str(e))
        raise HTTPException(status_code=500, detail="Contextual presets generation failed")


# Enhanced Text Generation Endpoints
@app.post("/api/v1/generate/text/ab-test")
async def generate_ab_test_variations(
    request: Dict[str, Any],
    _: None = Depends(check_rate_limit)
):
    """Generate A/B test variations using different psychological approaches"""
    try:
        logger.info(
            "A/B test generation request",
            context=request.get("context", "")[:50],
            test_type=request.get("test_type", "unknown")
        )
        
        context = request.get("context", "")
        format_type = request.get("format_type", "body")
        tone = request.get("tone", "professional")
        test_type = request.get("test_type", "emotional_vs_rational")
        variations_per_approach = request.get("variations_per_approach", 2)
        
        response = await text_generation_service.generate_ab_test_variations(
            context=context,
            format_type=format_type,
            tone=tone,
            test_type=test_type,
            variations_per_approach=variations_per_approach
        )
        
        logger.info(
            "A/B test generation completed",
            job_id=response["job_id"],
            test_type=response["test_type"],
            recommended_winner=response["recommended_winner"]
        )
        
        return response
        
    except ValueError as e:
        logger.warning("Invalid A/B test generation request", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("A/B test generation failed", error=str(e))
        raise HTTPException(status_code=500, detail="A/B test generation failed")


@app.post("/api/v1/generate/text/content-analysis")
async def analyze_content(
    request: Dict[str, Any],
    _: None = Depends(check_rate_limit)
):
    """Analyze content for optimization opportunities using AI"""
    try:
        logger.info(
            "Content analysis request",
            text_length=len(request.get("text", ""))
        )
        
        text = request.get("text", "")
        
        if not text:
            raise ValueError("Text content is required for analysis")
        
        response = await text_generation_service.smart_content_analysis(text)
        
        logger.info(
            "Content analysis completed",
            job_id=response["job_id"],
            overall_score=response["overall_score"]
        )
        
        return response
        
    except ValueError as e:
        logger.warning("Invalid content analysis request", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Content analysis failed", error=str(e))
        raise HTTPException(status_code=500, detail="Content analysis failed")


@app.post("/api/v1/generate/text/industry-optimized")
async def generate_industry_optimized_copy(
    request: Dict[str, Any],
    _: None = Depends(check_rate_limit)
):
    """Generate copy optimized for specific industries with best practices"""
    try:
        logger.info(
            "Industry-optimized generation request",
            industry=request.get("industry", "unknown"),
            format_type=request.get("format_type", "unknown")
        )
        
        context = request.get("context", "")
        industry = request.get("industry", "general")
        format_type = request.get("format_type", "body")
        tone = request.get("tone", "professional")
        target_audience = request.get("target_audience")
        
        response = await text_generation_service.generate_industry_optimized_copy(
            context=context,
            industry=industry,
            format_type=format_type,
            tone=tone,
            target_audience=target_audience
        )
        
        logger.info(
            "Industry-optimized generation completed",
            job_id=response.job_id,
            variation_count=len(response.variations)
        )
        
        return response
        
    except ValueError as e:
        logger.warning("Invalid industry-optimized generation request", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Industry-optimized generation failed", error=str(e))
        raise HTTPException(status_code=500, detail="Industry-optimized generation failed")


# Enhanced Background Processing Endpoints
@app.post("/api/v1/process/advanced-segmentation")
async def advanced_object_segmentation(
    request: Dict[str, Any],
    _: None = Depends(check_rate_limit)
):
    """Advanced object segmentation using SAM with interactive prompts"""
    try:
        logger.info(
            "Advanced segmentation request",
            image_url=request.get("image_url", ""),
            prompt_points=len(request.get("prompt_points", []))
        )
        
        image_url = request.get("image_url", "")
        prompt_points = request.get("prompt_points", [])
        prompt_labels = request.get("prompt_labels", [])
        
        if not image_url:
            raise ValueError("Image URL is required")
        
        if not prompt_points:
            raise ValueError("Prompt points are required for segmentation")
        
        response = await background_removal_service.advanced_object_segmentation(
            image_url=image_url,
            prompt_points=prompt_points,
            prompt_labels=prompt_labels
        )
        
        logger.info(
            "Advanced segmentation completed",
            job_id=response["job_id"],
            method=response["method"]
        )
        
        return response
        
    except ValueError as e:
        logger.warning("Invalid advanced segmentation request", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Advanced segmentation failed", error=str(e))
        raise HTTPException(status_code=500, detail="Advanced segmentation failed")


@app.post("/api/v1/process/batch-background-removal")
async def batch_background_removal(
    request: Dict[str, Any],
    _: None = Depends(check_rate_limit)
):
    """Process multiple images for background removal in batch"""
    try:
        logger.info(
            "Batch background removal request",
            image_count=len(request.get("image_urls", [])),
            content_type=request.get("content_type", "auto")
        )
        
        image_urls = request.get("image_urls", [])
        content_type = request.get("content_type", "auto")
        edge_refinement = request.get("edge_refinement", False)
        
        if not image_urls:
            raise ValueError("Image URLs are required for batch processing")
        
        response = await background_removal_service.batch_background_removal(
            image_urls=image_urls,
            content_type=content_type,
            edge_refinement=edge_refinement
        )
        
        logger.info(
            "Batch background removal completed",
            job_id=response["job_id"],
            success_rate=response["success_rate"]
        )
        
        return response
        
    except ValueError as e:
        logger.warning("Invalid batch background removal request", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Batch background removal failed", error=str(e))
        raise HTTPException(status_code=500, detail="Batch background removal failed")


@app.post("/api/v1/process/smart-object-detection")
async def smart_object_detection(
    request: Dict[str, Any],
    _: None = Depends(check_rate_limit)
):
    """Detect and classify objects in image for intelligent processing"""
    try:
        logger.info(
            "Smart object detection request",
            image_url=request.get("image_url", "")
        )
        
        image_url = request.get("image_url", "")
        
        if not image_url:
            raise ValueError("Image URL is required")
        
        response = await background_removal_service.smart_object_detection(image_url)
        
        logger.info(
            "Smart object detection completed",
            job_id=response["job_id"],
            object_count=response["analysis"]["total_objects"]
        )
        
        return response
        
    except ValueError as e:
        logger.warning("Invalid object detection request", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Object detection failed", error=str(e))
        raise HTTPException(status_code=500, detail="Object detection failed")


# Service Info Endpoints
@app.get("/api/v1/info/styles")
async def get_available_styles():
    """Get available image generation styles"""
    return {
        "styles": [
            {
                "id": style.value,
                "name": style.value.replace("-", " ").title(),
                "description": f"Generate images in {style.value} style"
            }
            for style in ImageGenerationRequest.__fields__["style"].type_
        ]
    }


@app.get("/api/v1/info/limits")
async def get_service_limits():
    """Get service limits and capabilities"""
    return {
        "image_generation": {
            "max_width": settings.max_image_size,
            "max_height": settings.max_image_size,
            "min_width": 256,
            "min_height": 256,
            "max_batch_size": settings.max_batch_size,
            "supported_formats": ["PNG", "JPEG"]
        },
        "rate_limits": {
            "requests_per_minute": settings.max_requests_per_minute,
            "max_concurrent_jobs": settings.max_concurrent_jobs
        }
    }


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with basic service info"""
    return {
        "service": "Creative Design Platform - AI Service",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "health": "/health"
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level.lower()
    )