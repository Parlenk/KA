"""
Text Generation Service using OpenAI GPT-4
"""
import openai
import asyncio
import logging
from typing import List, Dict, Optional
from datetime import datetime
import hashlib
import json

from ..config import settings
from ..models.schemas import (
    TextGenerationRequest, 
    TextGenerationResponse, 
    GeneratedText,
    TranslationRequest,
    TranslationResponse
)
from ..utils.cache import cache_result, get_cached_result

logger = logging.getLogger(__name__)

# Import translation libraries
try:
    import deepl
    DEEPL_AVAILABLE = True
except ImportError:
    DEEPL_AVAILABLE = False
    logger.warning("DeepL not available")

try:
    from googletrans import Translator as GoogleTranslator
    GOOGLE_TRANSLATE_AVAILABLE = True
except ImportError:
    GOOGLE_TRANSLATE_AVAILABLE = False
    logger.warning("Google Translate not available")


class TextGenerationService:
    """Service for generating and translating text using AI"""
    
    def __init__(self):
        # Initialize OpenAI
        if settings.openai_api_key:
            openai.api_key = settings.openai_api_key
            if settings.openai_organization:
                openai.organization = settings.openai_organization
        else:
            logger.warning("OpenAI API key not configured")
        
        # Initialize translation services
        self.deepl_translator = None
        if DEEPL_AVAILABLE and settings.deepl_api_key:
            self.deepl_translator = deepl.Translator(settings.deepl_api_key)
        
        self.google_translator = None
        if GOOGLE_TRANSLATE_AVAILABLE:
            self.google_translator = GoogleTranslator()
        
        # Tone definitions for copywriting
        self.tone_prompts = {
            "friendly": "Write in a warm, approachable, and conversational tone",
            "formal": "Write in a professional, polished, and business-appropriate tone",
            "casual": "Write in a relaxed, informal, and easygoing tone",
            "professional": "Write in a competent, authoritative, and business-focused tone",
            "optimistic": "Write in an upbeat, positive, and encouraging tone",
            "confident": "Write in a bold, assured, and self-assured tone",
            "assertive": "Write in a direct, decisive, and strong tone",
            "emotional": "Write in an evocative, heartfelt, and moving tone",
            "serious": "Write in a sober, thoughtful, and no-nonsense tone",
            "humorous": "Write in a witty, playful, and entertaining tone"
        }
    
    async def generate_text(self, request: TextGenerationRequest) -> TextGenerationResponse:
        """Generate text variations using GPT-4"""
        try:
            # Check cache
            cache_key = self._generate_cache_key(request)
            cached_result = await get_cached_result(cache_key)
            if cached_result:
                return TextGenerationResponse(**cached_result)
            
            # Build the system prompt
            system_prompt = self._build_system_prompt(request)
            
            # Generate variations
            variations = []
            num_variations = request.num_variations or 5
            
            # Use concurrent generation for multiple variations
            tasks = []
            for i in range(num_variations):
                task = self._generate_single_variation(
                    system_prompt,
                    request.prompt,
                    request.context,
                    i
                )
                tasks.append(task)
            
            results = await asyncio.gather(*tasks)
            
            # Process results
            for i, text in enumerate(results):
                if text:
                    variations.append(GeneratedText(
                        text=text,
                        tone=request.tone,
                        index=i,
                        word_count=len(text.split()),
                        character_count=len(text)
                    ))
            
            response = TextGenerationResponse(
                variations=variations,
                prompt=request.prompt,
                tone=request.tone,
                created_at=datetime.utcnow()
            )
            
            # Cache result
            await cache_result(cache_key, response.dict(), ttl=settings.ai_result_cache_ttl)
            
            return response
            
        except Exception as e:
            logger.error(f"Error generating text: {str(e)}")
            raise
    
    async def _generate_single_variation(
        self,
        system_prompt: str,
        user_prompt: str,
        context: Optional[str],
        index: int
    ) -> Optional[str]:
        """Generate a single text variation"""
        try:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
            
            if context:
                messages.insert(1, {"role": "system", "content": f"Context: {context}"})
            
            # Add variation instruction
            if index > 0:
                messages.append({
                    "role": "system", 
                    "content": f"Create variation #{index + 1} - make it noticeably different from previous versions"
                })
            
            response = await asyncio.to_thread(
                openai.ChatCompletion.create,
                model=settings.gpt_model,
                messages=messages,
                max_tokens=settings.gpt_max_tokens,
                temperature=settings.gpt_temperature + (index * 0.1),  # Increase temperature for more variation
                presence_penalty=0.3,
                frequency_penalty=0.3
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"Error in GPT-4 generation: {str(e)}")
            return None
    
    def _build_system_prompt(self, request: TextGenerationRequest) -> str:
        """Build the system prompt based on request parameters"""
        base_prompt = "You are an expert copywriter specializing in advertising and marketing content."
        
        # Add tone instruction
        if request.tone and request.tone in self.tone_prompts:
            base_prompt += f" {self.tone_prompts[request.tone]}."
        
        # Add type-specific instructions
        if request.type == "headline":
            base_prompt += " Create compelling, attention-grabbing headlines. Keep them concise and impactful."
        elif request.type == "body":
            base_prompt += " Write engaging body copy that connects with the audience and drives action."
        elif request.type == "cta":
            base_prompt += " Create powerful call-to-action phrases that motivate immediate response."
        elif request.type == "tagline":
            base_prompt += " Craft memorable taglines that capture the brand essence."
        
        # Add length constraints
        if request.max_length:
            base_prompt += f" Keep the text under {request.max_length} characters."
        
        # Add industry/audience context
        if request.industry:
            base_prompt += f" The content is for the {request.industry} industry."
        
        if request.target_audience:
            base_prompt += f" The target audience is: {request.target_audience}."
        
        return base_prompt
    
    async def translate_text(self, request: TranslationRequest) -> TranslationResponse:
        """Translate text to multiple languages"""
        try:
            translations = []
            
            for lang_code in request.target_languages:
                # Try DeepL first (better quality)
                if self.deepl_translator:
                    translation = await self._translate_deepl(request.text, lang_code)
                elif self.google_translator:
                    translation = await self._translate_google(request.text, lang_code)
                else:
                    # Fallback to GPT-4
                    translation = await self._translate_gpt4(request.text, lang_code)
                
                if translation:
                    translations.append({
                        "language": lang_code,
                        "text": translation,
                        "rtl": lang_code in ['ar', 'he', 'fa', 'ur']  # Right-to-left languages
                    })
            
            return TranslationResponse(
                original_text=request.text,
                translations=translations,
                source_language=request.source_language or "en"
            )
            
        except Exception as e:
            logger.error(f"Error translating text: {str(e)}")
            raise
    
    async def _translate_deepl(self, text: str, target_lang: str) -> Optional[str]:
        """Translate using DeepL API"""
        if not self.deepl_translator:
            return None
        
        try:
            result = await asyncio.to_thread(
                self.deepl_translator.translate_text,
                text,
                target_lang=target_lang.upper()
            )
            return result.text
        except Exception as e:
            logger.warning(f"DeepL translation failed: {str(e)}")
            return None
    
    async def _translate_google(self, text: str, target_lang: str) -> Optional[str]:
        """Translate using Google Translate"""
        if not self.google_translator:
            return None
        
        try:
            result = await asyncio.to_thread(
                self.google_translator.translate,
                text,
                dest=target_lang
            )
            return result.text
        except Exception as e:
            logger.warning(f"Google translation failed: {str(e)}")
            return None
    
    async def _translate_gpt4(self, text: str, target_lang: str) -> Optional[str]:
        """Translate using GPT-4 as fallback"""
        try:
            response = await asyncio.to_thread(
                openai.ChatCompletion.create,
                model=settings.gpt_model,
                messages=[
                    {
                        "role": "system",
                        "content": f"You are a professional translator. Translate the following text to {target_lang}. Maintain the tone and style of the original."
                    },
                    {"role": "user", "content": text}
                ],
                max_tokens=settings.gpt_max_tokens,
                temperature=0.3  # Lower temperature for more accurate translation
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"GPT-4 translation failed: {str(e)}")
            return None
    
    def _generate_cache_key(self, request: TextGenerationRequest) -> str:
        """Generate a cache key for the request"""
        key_data = {
            "prompt": request.prompt,
            "tone": request.tone,
            "type": request.type,
            "max_length": request.max_length,
            "num_variations": request.num_variations
        }
        key_string = json.dumps(key_data, sort_keys=True)
        return f"text_gen:{hashlib.md5(key_string.encode()).hexdigest()}"
    
    async def generate_ad_copy(
        self,
        product_name: str,
        product_description: str,
        target_audience: str,
        key_benefits: List[str],
        tone: str = "professional"
    ) -> Dict[str, List[str]]:
        """Generate complete ad copy package"""
        try:
            # Generate headlines
            headline_request = TextGenerationRequest(
                prompt=f"Create headlines for {product_name}",
                context=f"Product: {product_description}\nBenefits: {', '.join(key_benefits)}",
                type="headline",
                tone=tone,
                target_audience=target_audience,
                num_variations=5
            )
            headlines = await self.generate_text(headline_request)
            
            # Generate body copy
            body_request = TextGenerationRequest(
                prompt=f"Write compelling body copy for {product_name}",
                context=f"Product: {product_description}\nBenefits: {', '.join(key_benefits)}",
                type="body",
                tone=tone,
                target_audience=target_audience,
                num_variations=3
            )
            body_copy = await self.generate_text(body_request)
            
            # Generate CTAs
            cta_request = TextGenerationRequest(
                prompt=f"Create call-to-action buttons for {product_name}",
                type="cta",
                tone=tone,
                max_length=30,
                num_variations=5
            )
            ctas = await self.generate_text(cta_request)
            
            return {
                "headlines": [h.text for h in headlines.variations],
                "body_copy": [b.text for b in body_copy.variations],
                "ctas": [c.text for c in ctas.variations]
            }
            
        except Exception as e:
            logger.error(f"Error generating ad copy: {str(e)}")
            raise


# Singleton instance
text_generation_service = TextGenerationService()