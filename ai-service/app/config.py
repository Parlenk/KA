"""
AI Service Configuration
"""
from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    # Server Configuration
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False
    workers: int = 1
    
    # API Keys
    openai_api_key: Optional[str] = None
    openai_organization: Optional[str] = None
    replicate_api_token: Optional[str] = None
    removebg_api_key: Optional[str] = None
    deepl_api_key: Optional[str] = None
    google_translate_api_key: Optional[str] = None
    
    # Model Configuration
    sd_model_version: str = "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b"
    sd_steps: int = 50
    sd_guidance_scale: float = 7.5
    
    gpt_model: str = "gpt-4-turbo-preview"
    gpt_max_tokens: int = 500
    gpt_temperature: float = 0.7
    
    upscale_model: str = "nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b"
    
    # Feature Flags
    enable_ai_image_generation: bool = True
    enable_background_removal: bool = True
    enable_text_generation: bool = True
    enable_translation: bool = True
    enable_image_upscaling: bool = True
    enable_magic_animator: bool = True
    use_local_rembg: bool = False
    
    # Redis Configuration
    redis_url: str = "redis://localhost:6379"
    cache_ttl: int = 3600  # 1 hour
    ai_result_cache_ttl: int = 86400  # 24 hours
    
    # File Limits
    max_file_size: int = 104857600  # 100MB
    max_image_dimension: int = 4096
    
    # Timeouts
    ai_operation_timeout: int = 300  # 5 minutes
    
    # Monitoring
    sentry_dsn: Optional[str] = None
    log_level: str = "info"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()

# Validate critical API keys
def validate_settings():
    """Validate that required API keys are present based on enabled features"""
    errors = []
    
    if settings.enable_ai_image_generation and not settings.replicate_api_token:
        errors.append("REPLICATE_API_TOKEN required for image generation")
    
    if settings.enable_text_generation and not settings.openai_api_key:
        errors.append("OPENAI_API_KEY required for text generation")
    
    if settings.enable_background_removal and not settings.use_local_rembg and not settings.removebg_api_key:
        errors.append("REMOVEBG_API_KEY required for background removal (or enable USE_LOCAL_REMBG)")
    
    if settings.enable_translation and not (settings.deepl_api_key or settings.google_translate_api_key):
        errors.append("DEEPL_API_KEY or GOOGLE_TRANSLATE_API_KEY required for translation")
    
    if errors:
        print("Configuration errors:")
        for error in errors:
            print(f"  - {error}")
        print("\nPlease set the required environment variables in your .env file")
        # Don't exit in development, just warn
        if not settings.debug:
            raise ValueError("Missing required API keys")


# Run validation on import
if __name__ != "__main__":
    validate_settings()