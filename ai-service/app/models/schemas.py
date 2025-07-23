"""
Pydantic models for AI service API
"""
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


# Enums
class ImageStyle(str, Enum):
    realistic = "realistic"
    digital_art = "digital-art"
    three_d_model = "3d-model"
    isometric = "isometric"
    pixel_art = "pixel-art"
    anime = "anime"
    vaporwave = "vaporwave"


class TextTone(str, Enum):
    friendly = "friendly"
    formal = "formal"
    casual = "casual"
    professional = "professional"
    optimistic = "optimistic"
    confident = "confident"
    assertive = "assertive"
    emotional = "emotional"
    serious = "serious"
    humorous = "humorous"


class TextType(str, Enum):
    headline = "headline"
    body = "body"
    cta = "cta"
    tagline = "tagline"


class BackgroundType(str, Enum):
    auto = "auto"
    person = "person"
    product = "product"
    animal = "animal"
    car = "car"
    general = "general"
    human = "human"
    object = "object"
    clothing = "clothing"


# Image Generation Models
class ImageGenerationRequest(BaseModel):
    prompt: str = Field(..., description="Text prompt for image generation")
    style: Optional[ImageStyle] = Field(None, description="Art style for the image")
    negative_prompt: Optional[str] = Field(None, description="What to avoid in the image")
    width: Optional[int] = Field(1024, ge=512, le=2048, description="Image width")
    height: Optional[int] = Field(1024, ge=512, le=2048, description="Image height")
    num_images: Optional[int] = Field(4, ge=1, le=8, description="Number of images to generate")
    seed: Optional[int] = Field(None, description="Seed for reproducible generation")
    reference_image: Optional[str] = Field(None, description="Base64 encoded reference image")
    
    @validator('width', 'height')
    def validate_dimensions(cls, v):
        if v % 64 != 0:
            raise ValueError("Dimensions must be divisible by 64")
        return v


class GeneratedImage(BaseModel):
    url: str
    data: str = Field(..., description="Base64 encoded image data")
    width: int
    height: int
    seed: Optional[int] = None
    index: int


class ImageGenerationResponse(BaseModel):
    images: List[GeneratedImage]
    prompt: str
    enhanced_prompt: Optional[str] = None
    style: Optional[ImageStyle] = None
    created_at: datetime


# Background Removal Models
class BackgroundRemovalRequest(BaseModel):
    image_data: str = Field(..., description="Base64 encoded image")
    type: Optional[BackgroundType] = Field("auto", description="Type of foreground object")
    size: Optional[str] = Field("auto", description="Output size: auto, preview, small, regular, medium, hd, 4k")
    model_type: Optional[str] = Field("general", description="Model to use for removal")
    edge_refinement: Optional[bool] = Field(True, description="Apply edge refinement")
    feather_radius: Optional[int] = Field(2, ge=0, le=10, description="Edge feathering radius")


class BackgroundRemovalResponse(BaseModel):
    image_data: str = Field(..., description="Base64 encoded result image with transparency")
    mask_data: Optional[str] = Field(None, description="Base64 encoded mask image")
    width: int
    height: int
    format: str = "PNG"


# Text Generation Models
class TextGenerationRequest(BaseModel):
    prompt: str = Field(..., description="What to write about")
    tone: Optional[TextTone] = Field("professional", description="Writing tone")
    type: Optional[TextType] = Field(None, description="Type of text to generate")
    context: Optional[str] = Field(None, description="Additional context")
    max_length: Optional[int] = Field(None, ge=10, le=1000, description="Maximum character length")
    num_variations: Optional[int] = Field(5, ge=1, le=10, description="Number of variations")
    target_audience: Optional[str] = Field(None, description="Target audience description")
    industry: Optional[str] = Field(None, description="Industry or niche")


class GeneratedText(BaseModel):
    text: str
    tone: Optional[TextTone] = None
    index: int
    word_count: int
    character_count: int


class TextGenerationResponse(BaseModel):
    variations: List[GeneratedText]
    prompt: str
    tone: Optional[TextTone] = None
    created_at: datetime


# Translation Models
class TranslationRequest(BaseModel):
    text: str = Field(..., description="Text to translate")
    target_languages: List[str] = Field(..., description="Target language codes (e.g., ['es', 'fr', 'de'])")
    source_language: Optional[str] = Field("en", description="Source language code")
    preserve_formatting: Optional[bool] = Field(True, description="Preserve text formatting")


class TranslationResponse(BaseModel):
    original_text: str
    translations: List[Dict[str, Any]]  # {language: str, text: str, rtl: bool}
    source_language: str


# Image Upscaling Models
class ImageUpscaleRequest(BaseModel):
    image_data: str = Field(..., description="Base64 encoded image")
    scale: Optional[int] = Field(2, ge=2, le=4, description="Upscaling factor")
    face_enhance: Optional[bool] = Field(False, description="Apply face enhancement")
    denoise: Optional[bool] = Field(False, description="Apply denoising")
    sharpen: Optional[bool] = Field(False, description="Apply sharpening")
    output_format: Optional[str] = Field("PNG", description="Output format: PNG, JPEG, WEBP")


class ImageUpscaleResponse(BaseModel):
    image_data: str = Field(..., description="Base64 encoded upscaled image")
    original_width: int
    original_height: int
    upscaled_width: int
    upscaled_height: int
    actual_scale: float
    format: str


# Magic Animator Models
class MagicAnimatorRequest(BaseModel):
    canvas_objects: List[Dict[str, Any]] = Field(..., description="Canvas objects to animate")
    duration: Optional[int] = Field(5000, ge=1000, le=30000, description="Animation duration in ms")
    style: Optional[str] = Field("dynamic", description="Animation style")
    stagger: Optional[bool] = Field(True, description="Stagger animations")


class AnimationKeyframe(BaseModel):
    time: int
    properties: Dict[str, Any]
    easing: Optional[str] = "ease-in-out"


class ObjectAnimation(BaseModel):
    object_id: str
    keyframes: List[AnimationKeyframe]
    type: str  # "entry", "emphasis", "exit"


class MagicAnimatorResponse(BaseModel):
    animations: List[ObjectAnimation]
    duration: int
    style: str


# AI Banner Generator Models
class BannerGeneratorRequest(BaseModel):
    website_url: Optional[str] = Field(None, description="Website URL to extract brand from")
    brand_name: str = Field(..., description="Brand or company name")
    product_description: Optional[str] = Field(None, description="Product/service description")
    target_sizes: List[Dict[str, int]] = Field(..., description="List of {width, height} sizes")
    style_preference: Optional[str] = Field("modern", description="Design style preference")
    color_scheme: Optional[List[str]] = Field(None, description="Preferred colors (hex)")
    include_cta: Optional[bool] = Field(True, description="Include call-to-action")


class GeneratedBanner(BaseModel):
    size: Dict[str, int]  # {width, height}
    design_data: Dict[str, Any]  # Canvas JSON data
    preview_url: Optional[str] = None
    thumbnail: str  # Base64 thumbnail


class BannerGeneratorResponse(BaseModel):
    banners: List[GeneratedBanner]
    brand_colors: List[str]
    suggested_fonts: List[str]
    generated_copy: Dict[str, List[str]]  # headlines, body, ctas


# Smart Features Models
class SmartResizeRequest(BaseModel):
    design_data: Dict[str, Any] = Field(..., description="Original design canvas data")
    target_width: int
    target_height: int
    maintain_hierarchy: Optional[bool] = Field(True, description="Maintain visual hierarchy")
    allow_text_resize: Optional[bool] = Field(True, description="Allow text size adjustments")


class SmartResizeResponse(BaseModel):
    design_data: Dict[str, Any]
    adjustments_made: List[str]  # Description of changes
    quality_score: float  # 0-1 score of resize quality


# Object Removal Models
class ObjectRemovalRequest(BaseModel):
    image_data: str = Field(..., description="Base64 encoded image")
    mask_data: Optional[str] = Field(None, description="Base64 encoded mask of area to remove")
    selection_points: Optional[List[Dict[str, int]]] = Field(None, description="Points defining selection")
    inpaint_radius: Optional[int] = Field(3, ge=1, le=50, description="Inpainting radius")


class ObjectRemovalResponse(BaseModel):
    image_data: str
    removed_area: Dict[str, Any]  # Bounding box of removed area
    confidence: float  # 0-1 confidence score


# Background Generation Models  
class BackgroundGenerationRequest(BaseModel):
    foreground_data: str = Field(..., description="Base64 encoded foreground image with transparency")
    style: Optional[str] = Field("contextual", description="Background style")
    prompt: Optional[str] = Field(None, description="Custom background description")
    blur_background: Optional[bool] = Field(False, description="Apply blur to background")
    match_lighting: Optional[bool] = Field(True, description="Match foreground lighting")


class BackgroundGenerationResponse(BaseModel):
    image_data: str = Field(..., description="Base64 encoded complete image")
    background_only: str = Field(..., description="Base64 encoded background only")
    blend_mode: str
    opacity: float


# Batch Processing Models
class BatchRequest(BaseModel):
    operation: str = Field(..., description="Operation type: generate, remove_bg, upscale, etc.")
    items: List[Dict[str, Any]] = Field(..., description="List of items to process")
    options: Optional[Dict[str, Any]] = Field(None, description="Common options for all items")


class BatchItemResult(BaseModel):
    index: int
    success: bool
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class BatchResponse(BaseModel):
    job_id: str
    total_items: int
    completed_items: int
    failed_items: int
    results: List[BatchItemResult]
    status: str  # "pending", "processing", "completed", "failed"
    created_at: datetime
    completed_at: Optional[datetime] = None


# Health Check Models
class HealthStatus(BaseModel):
    service: str
    status: str  # "healthy", "degraded", "unhealthy"
    latency_ms: Optional[float] = None
    error: Optional[str] = None


class HealthCheckResponse(BaseModel):
    status: str  # Overall status
    timestamp: datetime
    services: List[HealthStatus]
    version: str