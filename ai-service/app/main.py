"""
AI Service Main Application
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import sentry_sdk
from sentry_sdk.integrations.asgi import SentryAsgiMiddleware
from contextlib import asynccontextmanager
import uvicorn

from .config import settings
from .utils.cache import init_redis, close_redis
from .api import (
    image_generation,
    background_removal,
    text_generation,
    image_upscaling,
    magic_animator,
    banner_generator,
    health
)

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Sentry if configured
if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.debug and "development" or "production",
        traces_sample_rate=0.1
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle"""
    # Startup
    logger.info("Starting AI Service...")
    await init_redis()
    logger.info("AI Service started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down AI Service...")
    await close_redis()
    logger.info("AI Service shut down successfully")


# Create FastAPI app
app = FastAPI(
    title="Creative Design Platform - AI Service",
    description="AI-powered features for image generation, text creation, and smart design tools",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add Sentry middleware if configured
if settings.sentry_dsn:
    app.add_middleware(SentryAsgiMiddleware)

# Include routers
app.include_router(health.router, tags=["health"])
app.include_router(image_generation.router, prefix="/api/v1/images", tags=["images"])
app.include_router(background_removal.router, prefix="/api/v1/background", tags=["background"])
app.include_router(text_generation.router, prefix="/api/v1/text", tags=["text"])
app.include_router(image_upscaling.router, prefix="/api/v1/upscale", tags=["upscale"])
app.include_router(magic_animator.router, prefix="/api/v1/animate", tags=["animation"])
app.include_router(banner_generator.router, prefix="/api/v1/banners", tags=["banners"])


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc) if settings.debug else "An unexpected error occurred"
        }
    )


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Creative Design Platform - AI Service",
        "version": "1.0.0",
        "status": "operational",
        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "redoc": "/redoc"
        }
    }


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        workers=settings.workers if not settings.debug else 1,
        log_level=settings.log_level.lower()
    )