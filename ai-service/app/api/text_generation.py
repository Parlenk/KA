"""
Text Generation API endpoints
"""
from fastapi import APIRouter, HTTPException
import logging
from typing import List, Dict

from ..models.schemas import (
    TextGenerationRequest,
    TextGenerationResponse,
    TranslationRequest,
    TranslationResponse
)
from ..services.text_generation import text_generation_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/generate", response_model=TextGenerationResponse)
async def generate_text(request: TextGenerationRequest):
    """Generate text variations using AI"""
    try:
        result = await text_generation_service.generate_text(request)
        return result
    except Exception as e:
        logger.error(f"Text generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/translate", response_model=TranslationResponse)
async def translate_text(request: TranslationRequest):
    """Translate text to multiple languages"""
    try:
        result = await text_generation_service.translate_text(request)
        return result
    except Exception as e:
        logger.error(f"Translation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ad-copy")
async def generate_ad_copy(
    product_name: str,
    product_description: str,
    target_audience: str,
    key_benefits: List[str],
    tone: str = "professional"
) -> Dict[str, List[str]]:
    """Generate complete ad copy package"""
    try:
        result = await text_generation_service.generate_ad_copy(
            product_name,
            product_description,
            target_audience,
            key_benefits,
            tone
        )
        return result
    except Exception as e:
        logger.error(f"Ad copy generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tones")
async def get_available_tones():
    """Get list of available writing tones"""
    return {
        "tones": [
            {
                "id": "friendly",
                "name": "Friendly",
                "description": "Warm, approachable, and conversational"
            },
            {
                "id": "formal",
                "name": "Formal",
                "description": "Professional, polished, and business-appropriate"
            },
            {
                "id": "casual",
                "name": "Casual",
                "description": "Relaxed, informal, and easygoing"
            },
            {
                "id": "professional",
                "name": "Professional",
                "description": "Competent, authoritative, and business-focused"
            },
            {
                "id": "optimistic",
                "name": "Optimistic",
                "description": "Upbeat, positive, and encouraging"
            },
            {
                "id": "confident",
                "name": "Confident",
                "description": "Bold, assured, and self-assured"
            },
            {
                "id": "assertive",
                "name": "Assertive",
                "description": "Direct, decisive, and strong"
            },
            {
                "id": "emotional",
                "name": "Emotional",
                "description": "Evocative, heartfelt, and moving"
            },
            {
                "id": "serious",
                "name": "Serious",
                "description": "Sober, thoughtful, and no-nonsense"
            },
            {
                "id": "humorous",
                "name": "Humorous",
                "description": "Witty, playful, and entertaining"
            }
        ]
    }


@router.get("/languages")
async def get_supported_languages():
    """Get list of supported languages for translation"""
    return {
        "languages": [
            {"code": "es", "name": "Spanish", "native": "Español"},
            {"code": "fr", "name": "French", "native": "Français"},
            {"code": "de", "name": "German", "native": "Deutsch"},
            {"code": "it", "name": "Italian", "native": "Italiano"},
            {"code": "pt", "name": "Portuguese", "native": "Português"},
            {"code": "nl", "name": "Dutch", "native": "Nederlands"},
            {"code": "ru", "name": "Russian", "native": "Русский"},
            {"code": "ja", "name": "Japanese", "native": "日本語"},
            {"code": "ko", "name": "Korean", "native": "한국어"},
            {"code": "zh", "name": "Chinese", "native": "中文"},
            {"code": "ar", "name": "Arabic", "native": "العربية"},
            {"code": "hi", "name": "Hindi", "native": "हिन्दी"},
            {"code": "tr", "name": "Turkish", "native": "Türkçe"},
            {"code": "pl", "name": "Polish", "native": "Polski"},
            {"code": "sv", "name": "Swedish", "native": "Svenska"},
            {"code": "no", "name": "Norwegian", "native": "Norsk"},
            {"code": "da", "name": "Danish", "native": "Dansk"},
            {"code": "fi", "name": "Finnish", "native": "Suomi"},
            {"code": "cs", "name": "Czech", "native": "Čeština"},
            {"code": "ro", "name": "Romanian", "native": "Română"}
        ]
    }