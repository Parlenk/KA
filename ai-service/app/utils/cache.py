"""
Redis caching utilities for AI service
"""
import redis.asyncio as redis
import json
import logging
from typing import Optional, Any
from datetime import timedelta

from ..config import settings

logger = logging.getLogger(__name__)

# Global Redis client
redis_client: Optional[redis.Redis] = None


async def init_redis():
    """Initialize Redis connection"""
    global redis_client
    try:
        redis_client = redis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True
        )
        await redis_client.ping()
        logger.info("Redis connection established")
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {str(e)}")
        redis_client = None


async def close_redis():
    """Close Redis connection"""
    global redis_client
    if redis_client:
        await redis_client.close()
        redis_client = None


async def cache_result(key: str, value: Any, ttl: int = None) -> bool:
    """Cache a result with optional TTL"""
    if not redis_client:
        return False
    
    try:
        ttl = ttl or settings.cache_ttl
        serialized = json.dumps(value)
        await redis_client.setex(key, ttl, serialized)
        logger.debug(f"Cached result for key: {key}")
        return True
    except Exception as e:
        logger.error(f"Cache write error: {str(e)}")
        return False


async def get_cached_result(key: str) -> Optional[Any]:
    """Get cached result if exists"""
    if not redis_client:
        return None
    
    try:
        cached = await redis_client.get(key)
        if cached:
            logger.debug(f"Cache hit for key: {key}")
            return json.loads(cached)
        return None
    except Exception as e:
        logger.error(f"Cache read error: {str(e)}")
        return None


async def delete_cache(key: str) -> bool:
    """Delete a cached item"""
    if not redis_client:
        return False
    
    try:
        result = await redis_client.delete(key)
        return result > 0
    except Exception as e:
        logger.error(f"Cache delete error: {str(e)}")
        return False


async def clear_cache_pattern(pattern: str) -> int:
    """Clear all cache entries matching a pattern"""
    if not redis_client:
        return 0
    
    try:
        keys = []
        async for key in redis_client.scan_iter(match=pattern):
            keys.append(key)
        
        if keys:
            deleted = await redis_client.delete(*keys)
            logger.info(f"Cleared {deleted} cache entries matching pattern: {pattern}")
            return deleted
        return 0
    except Exception as e:
        logger.error(f"Cache clear error: {str(e)}")
        return 0


async def set_job_status(job_id: str, status: dict, ttl: int = 3600) -> bool:
    """Set job status for async operations"""
    if not redis_client:
        return False
    
    try:
        key = f"job:{job_id}"
        await redis_client.setex(key, ttl, json.dumps(status))
        return True
    except Exception as e:
        logger.error(f"Failed to set job status: {str(e)}")
        return False


async def get_job_status(job_id: str) -> Optional[dict]:
    """Get job status"""
    if not redis_client:
        return None
    
    try:
        key = f"job:{job_id}"
        status = await redis_client.get(key)
        return json.loads(status) if status else None
    except Exception as e:
        logger.error(f"Failed to get job status: {str(e)}")
        return None


async def increment_usage(user_id: str, feature: str, amount: int = 1) -> int:
    """Increment usage counter for rate limiting"""
    if not redis_client:
        return 0
    
    try:
        key = f"usage:{user_id}:{feature}:{datetime.now().strftime('%Y%m%d')}"
        new_count = await redis_client.incrby(key, amount)
        await redis_client.expire(key, 86400)  # Expire after 24 hours
        return new_count
    except Exception as e:
        logger.error(f"Failed to increment usage: {str(e)}")
        return 0


async def check_rate_limit(user_id: str, feature: str, limit: int) -> bool:
    """Check if user has exceeded rate limit"""
    if not redis_client:
        return True  # Allow if Redis is down
    
    try:
        key = f"usage:{user_id}:{feature}:{datetime.now().strftime('%Y%m%d')}"
        current = await redis_client.get(key)
        return int(current or 0) < limit
    except Exception as e:
        logger.error(f"Failed to check rate limit: {str(e)}")
        return True