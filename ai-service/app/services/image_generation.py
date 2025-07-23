"""
Image Generation Service using Stable Diffusion via Replicate API
"""
import replicate
import openai
from PIL import Image
import io
import base64
import asyncio
from typing import List, Dict, Optional, Tuple
import aiohttp
import logging
from datetime import datetime
import hashlib
import json

from ..config import settings
from ..models.schemas import ImageGenerationRequest, ImageGenerationResponse, GeneratedImage
from ..utils.cache import cache_result, get_cached_result
from ..utils.image_utils import download_image, resize_image, optimize_image

logger = logging.getLogger(__name__)


class ImageGenerationService:
    """Service for generating images using Stable Diffusion"""
    
    def __init__(self):
        if settings.replicate_api_token:
            self.client = replicate.Client(api_token=settings.replicate_api_token)
        else:
            self.client = None
            logger.warning("Replicate API token not configured")
        
        # Initialize OpenAI for prompt enhancement
        if settings.openai_api_key:
            openai.api_key = settings.openai_api_key
            if settings.openai_organization:
                openai.organization = settings.openai_organization
        
        self.model_version = settings.sd_model_version
        self.styles = {
            "realistic": "photorealistic, high detail, professional photography",
            "digital-art": "digital art, concept art, artstation trending",
            "3d-model": "3d render, unreal engine, octane render, high quality",
            "isometric": "isometric view, 3d isometric, clean design",
            "pixel-art": "pixel art, 8-bit style, retro gaming",
            "anime": "anime style, manga, japanese animation",
            "vaporwave": "vaporwave aesthetic, neon colors, retro futuristic"
        }
    
    async def generate_images(self, request: ImageGenerationRequest) -> ImageGenerationResponse:
        """Generate images based on the request"""
        try:
            # Check cache first
            cache_key = self._generate_cache_key(request)
            cached_result = await get_cached_result(cache_key)
            if cached_result:
                logger.info(f"Returning cached result for prompt: {request.prompt[:50]}...")
                return ImageGenerationResponse(**cached_result)
            
            # Enhance prompt if requested
            enhanced_prompt = await self._enhance_prompt(request.prompt, request.style)
            
            # Add style modifiers
            if request.style and request.style in self.styles:
                enhanced_prompt = f"{enhanced_prompt}, {self.styles[request.style]}"
            
            # Add negative prompt for better quality
            negative_prompt = request.negative_prompt or "ugly, tiling, poorly drawn, out of frame, mutation, mutated, blurry, fuzzy, noise, low quality"
            
            # Generate images
            images = await self._generate_with_replicate(
                enhanced_prompt,
                negative_prompt,
                request.num_images or 4,
                request.width or 1024,
                request.height or 1024,
                request.seed
            )
            
            # Process and optimize images
            processed_images = []
            for i, image_url in enumerate(images):
                image_data = await download_image(image_url)
                optimized_data = await optimize_image(image_data, request.width, request.height)
                
                processed_images.append(GeneratedImage(
                    url=image_url,
                    data=base64.b64encode(optimized_data).decode('utf-8'),
                    width=request.width or 1024,
                    height=request.height or 1024,
                    seed=request.seed,
                    index=i
                ))
            
            response = ImageGenerationResponse(
                images=processed_images,
                prompt=request.prompt,
                enhanced_prompt=enhanced_prompt,
                style=request.style,
                created_at=datetime.utcnow()
            )
            
            # Cache the result
            await cache_result(cache_key, response.dict(), ttl=settings.ai_result_cache_ttl)
            
            return response
            
        except Exception as e:
            logger.error(f"Error generating images: {str(e)}")
            raise
    
    async def _enhance_prompt(self, prompt: str, style: Optional[str] = None) -> str:
        """Enhance the prompt using GPT-4 for better image generation"""
        if not settings.openai_api_key:
            return prompt
        
        try:
            system_prompt = """You are an expert at crafting prompts for Stable Diffusion image generation. 
            Enhance the given prompt to produce better, more detailed images. 
            Keep the core concept but add artistic details, lighting, composition, and quality modifiers.
            Keep it concise (under 200 characters) and avoid redundancy."""
            
            if style:
                system_prompt += f"\nThe desired style is: {style}"
            
            response = await asyncio.to_thread(
                openai.ChatCompletion.create,
                model=settings.gpt_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Enhance this prompt: {prompt}"}
                ],
                max_tokens=100,
                temperature=0.7
            )
            
            enhanced = response.choices[0].message.content.strip()
            logger.info(f"Enhanced prompt: {prompt} -> {enhanced}")
            return enhanced
            
        except Exception as e:
            logger.warning(f"Failed to enhance prompt: {str(e)}")
            return prompt
    
    async def _generate_with_replicate(
        self,
        prompt: str,
        negative_prompt: str,
        num_images: int,
        width: int,
        height: int,
        seed: Optional[int]
    ) -> List[str]:
        """Generate images using Replicate API"""
        if not self.client:
            raise ValueError("Replicate client not initialized")
        
        try:
            # Run the model
            output = await asyncio.to_thread(
                self.client.run,
                self.model_version,
                input={
                    "prompt": prompt,
                    "negative_prompt": negative_prompt,
                    "width": width,
                    "height": height,
                    "num_outputs": num_images,
                    "num_inference_steps": settings.sd_steps,
                    "guidance_scale": settings.sd_guidance_scale,
                    "scheduler": "DPMSolverMultistep",
                    "seed": seed or -1,
                    "refine": "expert_ensemble_refiner",
                    "high_noise_frac": 0.8
                }
            )
            
            # Output is a list of URLs
            return output if isinstance(output, list) else [output]
            
        except Exception as e:
            logger.error(f"Replicate API error: {str(e)}")
            raise
    
    def _generate_cache_key(self, request: ImageGenerationRequest) -> str:
        """Generate a cache key for the request"""
        key_data = {
            "prompt": request.prompt,
            "style": request.style,
            "width": request.width,
            "height": request.height,
            "num_images": request.num_images,
            "seed": request.seed
        }
        key_string = json.dumps(key_data, sort_keys=True)
        return f"image_gen:{hashlib.md5(key_string.encode()).hexdigest()}"
    
    async def generate_variations(self, image_url: str, num_variations: int = 4) -> ImageGenerationResponse:
        """Generate variations of an existing image"""
        try:
            # Download the reference image
            image_data = await download_image(image_url)
            
            # Use img2img model for variations
            output = await asyncio.to_thread(
                self.client.run,
                "stability-ai/stable-diffusion-img2img:15a3689ee13b0d2616e98820eca31d4c3abcd36672df6afce5cb6feb1d66087d",
                input={
                    "image": base64.b64encode(image_data).decode('utf-8'),
                    "prompt": "high quality, detailed",
                    "num_outputs": num_variations,
                    "guidance_scale": 7.5,
                    "prompt_strength": 0.8
                }
            )
            
            # Process results
            processed_images = []
            for i, url in enumerate(output):
                img_data = await download_image(url)
                processed_images.append(GeneratedImage(
                    url=url,
                    data=base64.b64encode(img_data).decode('utf-8'),
                    width=1024,
                    height=1024,
                    index=i
                ))
            
            return ImageGenerationResponse(
                images=processed_images,
                prompt="Image variations",
                created_at=datetime.utcnow()
            )
            
        except Exception as e:
            logger.error(f"Error generating variations: {str(e)}")
            raise


# Singleton instance
image_generation_service = ImageGenerationService()