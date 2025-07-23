"""
Base service classes and utilities for AI services
"""
import asyncio
import uuid
from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
import structlog
from datetime import datetime

from ..config import settings

logger = structlog.get_logger()


class BaseAIService(ABC):
    """Base class for all AI services"""
    
    def __init__(self):
        self.logger = logger.bind(service=self.__class__.__name__)
        self._is_initialized = False
    
    async def initialize(self) -> None:
        """Initialize the service"""
        if not self._is_initialized:
            await self._setup()
            self._is_initialized = True
            self.logger.info("Service initialized successfully")
    
    @abstractmethod
    async def _setup(self) -> None:
        """Setup method to be implemented by subclasses"""
        pass
    
    @abstractmethod
    async def health_check(self) -> bool:
        """Health check method to be implemented by subclasses"""
        pass
    
    def generate_job_id(self) -> str:
        """Generate a unique job ID"""
        return str(uuid.uuid4())
    
    async def _validate_image_size(self, width: int, height: int) -> None:
        """Validate image dimensions"""
        max_size = settings.max_image_size
        if width > max_size or height > max_size:
            raise ValueError(f"Image dimensions cannot exceed {max_size}x{max_size}")
        
        if width < 256 or height < 256:
            raise ValueError("Image dimensions must be at least 256x256")
    
    async def _log_job_start(self, job_id: str, operation: str, **kwargs) -> None:
        """Log job start"""
        self.logger.info(
            "Job started",
            job_id=job_id,
            operation=operation,
            timestamp=datetime.utcnow().isoformat(),
            **kwargs
        )
    
    async def _log_job_complete(self, job_id: str, operation: str, duration: float, **kwargs) -> None:
        """Log job completion"""
        self.logger.info(
            "Job completed",
            job_id=job_id,
            operation=operation,
            duration=duration,
            timestamp=datetime.utcnow().isoformat(),
            **kwargs
        )
    
    async def _log_job_error(self, job_id: str, operation: str, error: Exception, **kwargs) -> None:
        """Log job error"""
        self.logger.error(
            "Job failed",
            job_id=job_id,
            operation=operation,
            error=str(error),
            error_type=type(error).__name__,
            timestamp=datetime.utcnow().isoformat(),
            **kwargs
        )


class RateLimiter:
    """Simple rate limiter for API calls"""
    
    def __init__(self, max_requests: int = 60, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests = {}
    
    async def check_rate_limit(self, identifier: str) -> bool:
        """Check if request is within rate limit"""
        now = datetime.utcnow().timestamp()
        
        if identifier not in self.requests:
            self.requests[identifier] = []
        
        # Remove old requests outside the window
        self.requests[identifier] = [
            req_time for req_time in self.requests[identifier]
            if now - req_time < self.window_seconds
        ]
        
        # Check if under limit
        if len(self.requests[identifier]) >= self.max_requests:
            return False
        
        # Add current request
        self.requests[identifier].append(now)
        return True


class JobTracker:
    """In-memory job tracker for async operations"""
    
    def __init__(self):
        self.jobs: Dict[str, Dict[str, Any]] = {}
    
    def create_job(self, job_id: str, operation: str, **metadata) -> None:
        """Create a new job tracking entry"""
        self.jobs[job_id] = {
            "job_id": job_id,
            "operation": operation,
            "status": "pending",
            "progress": 0.0,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "result_url": None,
            "error_message": None,
            "metadata": metadata
        }
    
    def update_job(self, job_id: str, **updates) -> None:
        """Update job status"""
        if job_id in self.jobs:
            self.jobs[job_id].update(updates)
            self.jobs[job_id]["updated_at"] = datetime.utcnow().isoformat()
    
    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get job status"""
        return self.jobs.get(job_id)
    
    def set_job_processing(self, job_id: str, progress: float = 0.0) -> None:
        """Mark job as processing"""
        self.update_job(job_id, status="processing", progress=progress)
    
    def set_job_completed(self, job_id: str, result_url: str) -> None:
        """Mark job as completed"""
        self.update_job(
            job_id, 
            status="completed", 
            progress=100.0, 
            result_url=result_url
        )
    
    def set_job_failed(self, job_id: str, error_message: str) -> None:
        """Mark job as failed"""
        self.update_job(
            job_id, 
            status="failed", 
            error_message=error_message
        )


# Global instances
rate_limiter = RateLimiter(
    max_requests=settings.max_requests_per_minute,
    window_seconds=60
)

job_tracker = JobTracker()