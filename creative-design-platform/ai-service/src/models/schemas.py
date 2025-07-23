"""
Pydantic schemas for AI service API
"""
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field, HttpUrl
from enum import Enum


class ImageStyleEnum(str, Enum):
    """Image generation style options"""
    REALISTIC = "realistic"
    DIGITAL_ART = "digital-art"
    THREE_D_MODEL = "3d-model"
    ISOMETRIC = "isometric"
    PIXEL_ART = "pixel-art"
    ANIME = "anime"
    VAPORWAVE = "vaporwave"


class TextToneEnum(str, Enum):
    """Text generation tone options"""
    FRIENDLY = "friendly"
    FORMAL = "formal"
    CASUAL = "casual"
    PROFESSIONAL = "professional"
    OPTIMISTIC = "optimistic"
    CONFIDENT = "confident"
    ASSERTIVE = "assertive"
    EMOTIONAL = "emotional"
    SERIOUS = "serious"
    HUMOROUS = "humorous"


# Image Generation Schemas
class ImageGenerationRequest(BaseModel):
    """Request schema for AI image generation"""
    prompt: str = Field(..., description="Text prompt for image generation")
    style: ImageStyleEnum = Field(default=ImageStyleEnum.REALISTIC, description="Image style")
    width: int = Field(default=1024, ge=256, le=2048, description="Image width")
    height: int = Field(default=1024, ge=256, le=2048, description="Image height")
    batch_size: int = Field(default=1, ge=1, le=4, description="Number of images to generate")
    reference_image_url: Optional[HttpUrl] = Field(default=None, description="Reference image URL")
    negative_prompt: Optional[str] = Field(default=None, description="Negative prompt")
    seed: Optional[int] = Field(default=None, description="Random seed for reproducibility")


class GeneratedImage(BaseModel):
    """Schema for a generated image"""
    url: str = Field(..., description="Image URL")
    width: int = Field(..., description="Image width")
    height: int = Field(..., description="Image height")
    seed: Optional[int] = Field(default=None, description="Seed used for generation")


class ImageGenerationResponse(BaseModel):
    """Response schema for image generation"""
    images: List[GeneratedImage] = Field(..., description="Generated images")
    prompt: str = Field(..., description="Original prompt")
    style: ImageStyleEnum = Field(..., description="Style used")
    job_id: str = Field(..., description="Job ID for tracking")


# Background Removal Schemas
class BackgroundRemovalRequest(BaseModel):
    """Request schema for background removal"""
    image_url: str = Field(..., description="URL of image to process")
    edge_refinement: bool = Field(default=True, description="Apply edge refinement")


class BackgroundRemovalResponse(BaseModel):
    """Response schema for background removal"""
    result_url: str = Field(..., description="URL of processed image")
    original_url: str = Field(..., description="Original image URL")
    job_id: str = Field(..., description="Job ID for tracking")


# Background Generation Schemas
class BackgroundGenerationRequest(BaseModel):
    """Request schema for AI background generation"""
    subject_image_url: str = Field(..., description="Subject image with transparent background")
    style_prompt: str = Field(..., description="Background style description")
    style: ImageStyleEnum = Field(default=ImageStyleEnum.REALISTIC, description="Background style")
    preserve_lighting: bool = Field(default=True, description="Preserve subject lighting")


class BackgroundGenerationResponse(BaseModel):
    """Response schema for background generation"""
    result_url: str = Field(..., description="URL of image with new background")
    subject_url: str = Field(..., description="Original subject image URL")
    background_prompt: str = Field(..., description="Background prompt used")
    job_id: str = Field(..., description="Job ID for tracking")


# Text Generation Schemas
class TextGenerationRequest(BaseModel):
    """Request schema for AI text generation"""
    context: str = Field(..., description="Context or brief for text generation")
    tone: TextToneEnum = Field(default=TextToneEnum.FRIENDLY, description="Tone of voice")
    target_audience: Optional[str] = Field(default=None, description="Target audience description")
    max_length: int = Field(default=100, ge=10, le=500, description="Maximum text length")
    variation_count: int = Field(default=3, ge=1, le=10, description="Number of variations")
    format_type: Literal["headline", "subheading", "body", "cta", "tagline"] = Field(
        default="body", description="Type of text to generate"
    )


class GeneratedText(BaseModel):
    """Schema for generated text variation"""
    text: str = Field(..., description="Generated text")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Confidence score")


class TextGenerationResponse(BaseModel):
    """Response schema for text generation"""
    variations: List[GeneratedText] = Field(..., description="Generated text variations")
    context: str = Field(..., description="Original context")
    tone: TextToneEnum = Field(..., description="Tone used")
    job_id: str = Field(..., description="Job ID for tracking")


# Image Upscaling Schemas
class ImageUpscalingRequest(BaseModel):
    """Request schema for image upscaling"""
    image_url: str = Field(..., description="URL of image to upscale")
    scale_factor: int = Field(default=2, ge=2, le=4, description="Upscaling factor")
    enhance_quality: bool = Field(default=True, description="Apply quality enhancement")


class ImageUpscalingResponse(BaseModel):
    """Response schema for image upscaling"""
    result_url: str = Field(..., description="URL of upscaled image")
    original_url: str = Field(..., description="Original image URL")
    original_size: Dict[str, int] = Field(..., description="Original dimensions")
    new_size: Dict[str, int] = Field(..., description="New dimensions")
    job_id: str = Field(..., description="Job ID for tracking")


# Object Removal Schemas
class ObjectRemovalRequest(BaseModel):
    """Request schema for object removal"""
    image_url: str = Field(..., description="URL of image to process")
    mask_coordinates: List[List[int]] = Field(..., description="Polygon coordinates for object mask")
    inpaint_prompt: Optional[str] = Field(default=None, description="Prompt for inpainting")


class ObjectRemovalResponse(BaseModel):
    """Response schema for object removal"""
    result_url: str = Field(..., description="URL of processed image")
    original_url: str = Field(..., description="Original image URL")
    mask_area: float = Field(..., description="Percentage of image masked")
    job_id: str = Field(..., description="Job ID for tracking")


# Translation Schemas
class TranslationRequest(BaseModel):
    """Request schema for text translation"""
    text: str = Field(..., description="Text to translate")
    source_language: str = Field(default="auto", description="Source language code")
    target_language: str = Field(..., description="Target language code")
    preserve_formatting: bool = Field(default=True, description="Preserve text formatting")


class TranslationResponse(BaseModel):
    """Response schema for translation"""
    translated_text: str = Field(..., description="Translated text")
    source_language: str = Field(..., description="Detected source language")
    target_language: str = Field(..., description="Target language")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Translation confidence")
    job_id: str = Field(..., description="Job ID for tracking")


# Job Status Schemas
class JobStatusEnum(str, Enum):
    """Job status options"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class JobStatus(BaseModel):
    """Schema for job status tracking"""
    job_id: str = Field(..., description="Job ID")
    status: JobStatusEnum = Field(..., description="Job status")
    progress: float = Field(default=0.0, ge=0.0, le=100.0, description="Progress percentage")
    created_at: str = Field(..., description="Job creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")
    result_url: Optional[str] = Field(default=None, description="Result URL if completed")
    error_message: Optional[str] = Field(default=None, description="Error message if failed")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional metadata")


# Generic API Response Schemas
class ErrorResponse(BaseModel):
    """Error response schema"""
    error: str = Field(..., description="Error message")
    error_code: str = Field(..., description="Error code")
    details: Optional[Dict[str, Any]] = Field(default=None, description="Additional error details")


class HealthResponse(BaseModel):
    """Health check response schema"""
    status: Literal["healthy", "unhealthy"] = Field(..., description="Service health status")
    version: str = Field(..., description="Service version")
    uptime: float = Field(..., description="Service uptime in seconds")
    dependencies: Dict[str, bool] = Field(..., description="Dependency health status")