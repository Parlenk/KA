"""
Health Check API endpoints
"""
from fastapi import APIRouter
import logging
from datetime import datetime
import asyncio
import time

from ..models.schemas import HealthCheckResponse, HealthStatus
from ..config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """Comprehensive health check"""
    try:
        services = []
        overall_status = "healthy"
        
        # Check Redis
        redis_status = await check_redis_health()
        services.append(redis_status)
        if redis_status.status != "healthy":
            overall_status = "degraded"
        
        # Check OpenAI API
        if settings.openai_api_key:
            openai_status = await check_openai_health()
            services.append(openai_status)
            if openai_status.status != "healthy":
                overall_status = "degraded"
        
        # Check Replicate API
        if settings.replicate_api_token:
            replicate_status = await check_replicate_health()
            services.append(replicate_status)
            if replicate_status.status != "healthy":
                overall_status = "degraded"
        
        # Check Remove.bg API
        if settings.removebg_api_key:
            removebg_status = await check_removebg_health()
            services.append(removebg_status)
            if removebg_status.status != "healthy":
                overall_status = "degraded"
        
        return HealthCheckResponse(
            status=overall_status,
            timestamp=datetime.utcnow(),
            services=services,
            version="1.0.0"
        )
        
    except Exception as e:
        logger.error(f"Health check error: {str(e)}")
        return HealthCheckResponse(
            status="unhealthy",
            timestamp=datetime.utcnow(),
            services=[
                HealthStatus(
                    service="ai-service",
                    status="unhealthy",
                    error=str(e)
                )
            ],
            version="1.0.0"
        )


@router.get("/health/ready")
async def readiness_check():
    """Kubernetes readiness probe"""
    try:
        # Quick checks for essential services
        from ..utils.cache import redis_client
        
        if redis_client:
            await redis_client.ping()
        
        return {"status": "ready"}
    except Exception as e:
        logger.error(f"Readiness check failed: {str(e)}")
        return {"status": "not ready", "error": str(e)}


@router.get("/health/live")
async def liveness_check():
    """Kubernetes liveness probe"""
    return {"status": "alive", "timestamp": datetime.utcnow()}


async def check_redis_health() -> HealthStatus:
    """Check Redis connection health"""
    try:
        from ..utils.cache import redis_client
        
        if not redis_client:
            return HealthStatus(
                service="redis",
                status="unhealthy",
                error="Redis client not initialized"
            )
        
        start_time = time.time()
        await redis_client.ping()
        latency = (time.time() - start_time) * 1000
        
        return HealthStatus(
            service="redis",
            status="healthy",
            latency_ms=latency
        )
        
    except Exception as e:
        return HealthStatus(
            service="redis",
            status="unhealthy",
            error=str(e)
        )


async def check_openai_health() -> HealthStatus:
    """Check OpenAI API health"""
    try:
        import openai
        
        start_time = time.time()
        
        # Test with a minimal request
        response = await asyncio.to_thread(
            openai.ChatCompletion.create,
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "test"}],
            max_tokens=1
        )
        
        latency = (time.time() - start_time) * 1000
        
        return HealthStatus(
            service="openai",
            status="healthy",
            latency_ms=latency
        )
        
    except Exception as e:
        return HealthStatus(
            service="openai",
            status="unhealthy",
            error=str(e)
        )


async def check_replicate_health() -> HealthStatus:
    """Check Replicate API health"""
    try:
        import replicate
        
        client = replicate.Client(api_token=settings.replicate_api_token)
        
        start_time = time.time()
        
        # Just test authentication by listing models (with limit)
        models = await asyncio.to_thread(
            lambda: list(client.models.list())[:1]
        )
        
        latency = (time.time() - start_time) * 1000
        
        return HealthStatus(
            service="replicate",
            status="healthy",
            latency_ms=latency
        )
        
    except Exception as e:
        return HealthStatus(
            service="replicate",
            status="unhealthy",
            error=str(e)
        )


async def check_removebg_health() -> HealthStatus:
    """Check Remove.bg API health"""
    try:
        import aiohttp
        
        start_time = time.time()
        
        async with aiohttp.ClientSession() as session:
            async with session.get(
                "https://api.remove.bg/v1.0/account",
                headers={"X-Api-Key": settings.removebg_api_key},
                timeout=aiohttp.ClientTimeout(total=5)
            ) as response:
                if response.status == 200:
                    latency = (time.time() - start_time) * 1000
                    return HealthStatus(
                        service="removebg",
                        status="healthy",
                        latency_ms=latency
                    )
                else:
                    return HealthStatus(
                        service="removebg",
                        status="unhealthy",
                        error=f"API returned status {response.status}"
                    )
                    
    except Exception as e:
        return HealthStatus(
            service="removebg",
            status="unhealthy",
            error=str(e)
        )