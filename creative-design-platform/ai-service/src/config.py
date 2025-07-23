"""
AI Service Configuration Module
"""
from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    # Server Configuration
    host: str = Field(default="0.0.0.0", description="Server host")
    port: int = Field(default=8000, description="Server port")
    debug: bool = Field(default=False, description="Debug mode")
    environment: str = Field(default="development", description="Environment")
    
    # API Keys
    openai_api_key: Optional[str] = Field(default=None, description="OpenAI API key")
    replicate_api_token: Optional[str] = Field(default=None, description="Replicate API token")
    removebg_api_key: Optional[str] = Field(default=None, description="Remove.bg API key")
    deepl_api_key: Optional[str] = Field(default=None, description="DeepL API key")
    
    # Database Configuration
    database_url: str = Field(
        default="postgresql://user:password@localhost:5432/kreativo_ads",
        description="Database connection URL"
    )
    redis_url: str = Field(
        default="redis://localhost:6379", 
        description="Redis connection URL"
    )
    
    # Storage Configuration
    storage_type: str = Field(default="local", description="Storage type (local, s3)")
    s3_bucket: Optional[str] = Field(default=None, description="S3 bucket name")
    s3_region: str = Field(default="us-east-1", description="S3 region")
    aws_access_key_id: Optional[str] = Field(default=None, description="AWS access key")
    aws_secret_access_key: Optional[str] = Field(default=None, description="AWS secret key")
    
    # Model Configuration
    stable_diffusion_model: str = Field(
        default="stable-diffusion-xl-base-1.0",
        description="Stable Diffusion model name"
    )
    max_image_size: int = Field(default=2048, description="Maximum image size")
    max_batch_size: int = Field(default=4, description="Maximum batch size")
    
    # Rate Limiting
    max_requests_per_minute: int = Field(default=60, description="Rate limit per minute")
    max_concurrent_jobs: int = Field(default=10, description="Max concurrent jobs")
    
    # Logging
    log_level: str = Field(default="INFO", description="Log level")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Global settings instance
settings = Settings()