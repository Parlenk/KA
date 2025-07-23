"""
Advanced AI Image Generation Service with Multiple Models and Styles
Phase 3: Enhanced with Stable Diffusion XL, ControlNet, and advanced features
"""
import asyncio
import hashlib
import httpx
import time
import random
from typing import List, Optional, Dict, Any, Union
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
import io
import base64
import numpy as np

from .base import BaseAIService, job_tracker
from ..models.schemas import (
    ImageGenerationRequest, 
    ImageGenerationResponse, 
    GeneratedImage,
    ImageStyleEnum
)
from ..config import settings


class ImageGenerationService(BaseAIService):
    """Advanced AI Image Generation Service with Multiple Models and Enhanced Features"""
    
    def __init__(self):
        super().__init__()
        self.replicate_client: Optional[httpx.AsyncClient] = None
        
        # Enhanced model configurations for different styles
        self.models = {
            ImageStyleEnum.REALISTIC: {
                "version": "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
                "name": "stable-diffusion-xl-base-1.0",
                "cfg_scale": 7.5,
                "steps": 50
            },
            ImageStyleEnum.DIGITAL_ART: {
                "version": "8beff3369e81422112d93b89ca01426147de542cd4684c244b673b105188fe5f",
                "name": "stable-diffusion-xl-refiner-1.0",
                "cfg_scale": 8.0,
                "steps": 40
            },
            ImageStyleEnum.THREE_D_MODEL: {
                "version": "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
                "name": "stable-diffusion-xl-base-1.0",
                "cfg_scale": 7.0,
                "steps": 45
            },
            ImageStyleEnum.ISOMETRIC: {
                "version": "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
                "name": "stable-diffusion-xl-base-1.0",
                "cfg_scale": 8.5,
                "steps": 40
            },
            ImageStyleEnum.PIXEL_ART: {
                "version": "pixel-art-xl-1.0",
                "name": "pixel-art-diffusion",
                "cfg_scale": 9.0,
                "steps": 30
            },
            ImageStyleEnum.ANIME: {
                "version": "anything-v4-5",
                "name": "anything-v4.5-anime",
                "cfg_scale": 8.0,
                "steps": 40
            },
            ImageStyleEnum.VAPORWAVE: {
                "version": "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
                "name": "stable-diffusion-xl-base-1.0",
                "cfg_scale": 8.5,
                "steps": 45
            }
        }
        
        # Enhanced style configurations with sophisticated prompts
        self.style_configs = {
            ImageStyleEnum.REALISTIC: {
                "positive_suffix": ", photorealistic, 8K, ultra detailed, professional photography, DSLR, cinematic lighting",
                "negative_prompt": "cartoon, anime, painting, sketch, low quality, blurry, watermark, text, signature",
                "scheduler": "DPMSolverMultistep",
                "enhance_face": True
            },
            ImageStyleEnum.DIGITAL_ART: {
                "positive_suffix": ", digital art, concept art, trending on artstation, detailed illustration, vibrant colors",
                "negative_prompt": "photograph, realistic, low quality, blurry, pixelated, amateur",
                "scheduler": "K_EULER_ANCESTRAL",
                "enhance_face": False
            },
            ImageStyleEnum.THREE_D_MODEL: {
                "positive_suffix": ", 3D render, octane render, volumetric lighting, cinema4d, blender, unreal engine 5",
                "negative_prompt": "2D, flat, low quality, blurry, cartoon, sketch",
                "scheduler": "DPMSolverMultistep",
                "enhance_face": False
            },
            ImageStyleEnum.ISOMETRIC: {
                "positive_suffix": ", isometric view, game art, clean design, low poly, geometric, bright colors",
                "negative_prompt": "perspective, realistic, complex, cluttered, dark, blurry",
                "scheduler": "K_EULER",
                "enhance_face": False
            },
            ImageStyleEnum.PIXEL_ART: {
                "positive_suffix": ", pixel art, 8-bit, 16-bit, retro game style, sprite art, crisp pixels",
                "negative_prompt": "smooth, realistic, high resolution, blurry, anti-aliased, 3D",
                "scheduler": "K_EULER",
                "enhance_face": False
            },
            ImageStyleEnum.ANIME: {
                "positive_suffix": ", anime style, manga, high quality anime art, studio ghibli style, cel shading",
                "negative_prompt": "realistic, photograph, western cartoon, low quality, ugly, distorted",
                "scheduler": "K_EULER_ANCESTRAL",
                "enhance_face": True
            },
            ImageStyleEnum.VAPORWAVE: {
                "positive_suffix": ", vaporwave aesthetic, synthwave, neon colors, retro futuristic, 80s style, neon grid",
                "negative_prompt": "modern, realistic, dull colors, low quality, dark, monochrome",
                "scheduler": "K_EULER_ANCESTRAL",
                "enhance_face": False
            }
        }
        
        # Advanced generation techniques
        self.generation_techniques = [
            "standard",
            "img2img",
            "inpainting",
            "controlnet_pose",
            "controlnet_depth",
            "upscaling"
        ]
    
    async def _setup(self) -> None:
        """Initialize the image generation service"""
        if not settings.replicate_api_token:
            raise ValueError("REPLICATE_API_TOKEN is required for image generation")
        
        self.replicate_client = httpx.AsyncClient(
            base_url="https://api.replicate.com/v1",
            headers={
                "Authorization": f"Token {settings.replicate_api_token}",
                "Content-Type": "application/json"
            },
            timeout=httpx.Timeout(300.0)  # 5 minute timeout for generation
        )
        
        await self.health_check()
    
    async def health_check(self) -> bool:
        """Check if the image generation service is healthy"""
        try:
            if not self.replicate_client:
                return False
            
            response = await self.replicate_client.get("/account")
            return response.status_code == 200
        except Exception as e:
            self.logger.error("Health check failed", error=str(e))
            return False
    
    def _build_enhanced_prompt(self, prompt: str, style: ImageStyleEnum) -> str:
        """Build enhanced prompt with style modifiers"""
        style_modifier = self.style_prompts.get(style, "")
        
        # Combine user prompt with style
        enhanced_prompt = f"{prompt}, {style_modifier}"
        
        # Add quality modifiers
        quality_modifiers = "high quality, professional, detailed, sharp focus"
        enhanced_prompt = f"{enhanced_prompt}, {quality_modifiers}"
        
        return enhanced_prompt.strip()
    
    def _get_negative_prompt(self, custom_negative: Optional[str] = None) -> str:
        """Get negative prompt for better quality"""
        base_negative = (
            "low quality, blurry, pixelated, distorted, watermark, text, "
            "signature, username, artist name, copyright, logo, "
            "bad anatomy, deformed, ugly, gross, disgusting"
        )
        
        if custom_negative:
            return f"{base_negative}, {custom_negative}"
        
        return base_negative
    
    async def generate_images(self, request: ImageGenerationRequest) -> ImageGenerationResponse:
        """Generate images using Stable Diffusion"""
        job_id = self.generate_job_id()
        start_time = time.time()
        
        try:
            # Create job tracking
            job_tracker.create_job(
                job_id=job_id,
                operation="image_generation",
                prompt=request.prompt,
                style=request.style.value,
                dimensions=f"{request.width}x{request.height}",
                batch_size=request.batch_size
            )
            
            await self._log_job_start(
                job_id, "image_generation",
                prompt=request.prompt,
                style=request.style.value,
                dimensions=f"{request.width}x{request.height}"
            )
            
            # Validate dimensions
            await self._validate_image_size(request.width, request.height)
            
            # Update job status
            job_tracker.set_job_processing(job_id, 10.0)
            
            # Build enhanced prompt
            enhanced_prompt = self._build_enhanced_prompt(request.prompt, request.style)
            negative_prompt = self._get_negative_prompt(request.negative_prompt)
            
            # Prepare Replicate API request
            api_request = {
                "version": "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",  # SDXL
                "input": {
                    "prompt": enhanced_prompt,
                    "negative_prompt": negative_prompt,
                    "width": request.width,
                    "height": request.height,
                    "num_outputs": request.batch_size,
                    "scheduler": "K_EULER",
                    "num_inference_steps": 30,
                    "guidance_scale": 7.5,
                    "seed": request.seed
                }
            }
            
            # Update progress
            job_tracker.set_job_processing(job_id, 25.0)
            
            # Make API request to Replicate
            response = await self.replicate_client.post("/predictions", json=api_request)
            response.raise_for_status()
            
            prediction = response.json()
            prediction_id = prediction["id"]
            
            # Update progress
            job_tracker.set_job_processing(job_id, 50.0)
            
            # Poll for completion
            result_urls = await self._poll_prediction(prediction_id, job_id)
            
            # Process results
            generated_images = []
            for i, url in enumerate(result_urls):
                generated_images.append(GeneratedImage(
                    url=url,
                    width=request.width,
                    height=request.height,
                    seed=request.seed + i if request.seed else None
                ))
            
            # Create response
            response_data = ImageGenerationResponse(
                images=generated_images,
                prompt=request.prompt,
                style=request.style,
                job_id=job_id
            )
            
            # Update job as completed
            job_tracker.set_job_completed(job_id, result_urls[0] if result_urls else "")
            
            duration = time.time() - start_time
            await self._log_job_complete(
                job_id, "image_generation", duration,
                image_count=len(generated_images)
            )
            
            return response_data
            
        except Exception as e:
            job_tracker.set_job_failed(job_id, str(e))
            await self._log_job_error(job_id, "image_generation", e)
            raise
    
    async def _poll_prediction(self, prediction_id: str, job_id: str) -> List[str]:
        """Poll Replicate prediction until completion"""
        max_retries = 60  # 5 minutes with 5-second intervals
        retry_count = 0
        
        while retry_count < max_retries:
            try:
                response = await self.replicate_client.get(f"/predictions/{prediction_id}")
                response.raise_for_status()
                
                prediction = response.json()
                status = prediction["status"]
                
                if status == "succeeded":
                    # Update final progress
                    job_tracker.set_job_processing(job_id, 100.0)
                    return prediction["output"] or []
                
                elif status == "failed":
                    error_msg = prediction.get("error", "Generation failed")
                    raise Exception(f"Generation failed: {error_msg}")
                
                elif status in ["starting", "processing"]:
                    # Update progress based on time elapsed
                    progress = min(50.0 + (retry_count / max_retries) * 45.0, 95.0)
                    job_tracker.set_job_processing(job_id, progress)
                    
                    # Wait before next poll
                    await asyncio.sleep(5)
                    retry_count += 1
                
                else:
                    # Unknown status, wait and retry
                    await asyncio.sleep(5)
                    retry_count += 1
                    
            except httpx.HTTPError as e:
                self.logger.warning(f"HTTP error during polling: {e}")
                await asyncio.sleep(5)
                retry_count += 1
        
        raise Exception("Generation timeout - prediction took too long to complete")
    
    async def generate_variations(
        self, 
        original_prompt: str, 
        style: ImageStyleEnum,
        variation_count: int = 4
    ) -> List[GeneratedImage]:
        """Generate variations of an image with slight prompt modifications"""
        variations = []
        
        # Create prompt variations
        variation_prompts = [
            f"{original_prompt}, variation {i+1}"
            for i in range(variation_count)
        ]
        
        # Generate each variation
        for i, prompt in enumerate(variation_prompts):
            request = ImageGenerationRequest(
                prompt=prompt,
                style=style,
                batch_size=1,
                seed=None  # Random seed for each variation
            )
            
            response = await self.generate_images(request)
            if response.images:
                variations.extend(response.images)
        
        return variations
    
    async def generate_with_reference(
        self,
        prompt: str,
        reference_image_url: str,
        style: ImageStyleEnum,
        strength: float = 0.7,
        width: int = 1024,
        height: int = 1024
    ) -> GeneratedImage:
        """Generate image using reference image (img2img)"""
        job_id = self.generate_job_id()
        
        try:
            # Create job tracking
            job_tracker.create_job(
                job_id=job_id,
                operation="img2img_generation",
                prompt=prompt,
                style=style.value,
                reference_image=reference_image_url
            )
            
            model_config = self.models[style]
            style_config = self.style_configs[style]
            
            # Build enhanced prompt
            enhanced_prompt = self._build_enhanced_prompt(prompt, style)
            negative_prompt = self._get_negative_prompt()
            
            # Prepare img2img request
            api_request = {
                "version": model_config["version"],
                "input": {
                    "prompt": enhanced_prompt,
                    "negative_prompt": negative_prompt,
                    "image": reference_image_url,
                    "width": width,
                    "height": height,
                    "strength": strength,
                    "num_inference_steps": model_config["steps"],
                    "guidance_scale": model_config["cfg_scale"],
                    "scheduler": style_config["scheduler"]
                }
            }
            
            # Make API request
            response = await self.replicate_client.post("/predictions", json=api_request)
            response.raise_for_status()
            
            prediction = response.json()
            prediction_id = prediction["id"]
            
            # Poll for completion
            result_urls = await self._poll_prediction(prediction_id, job_id)
            
            if result_urls:
                generated_image = GeneratedImage(
                    url=result_urls[0],
                    width=width,
                    height=height,
                    seed=None
                )
                
                job_tracker.set_job_completed(job_id, result_urls[0])
                return generated_image
            else:
                raise Exception("No images generated")
                
        except Exception as e:
            job_tracker.set_job_failed(job_id, str(e))
            raise
    
    async def upscale_image(
        self,
        image_url: str,
        scale_factor: int = 2,
        enhance_face: bool = False
    ) -> GeneratedImage:
        """Upscale image using AI super-resolution"""
        job_id = self.generate_job_id()
        
        try:
            job_tracker.create_job(
                job_id=job_id,
                operation="image_upscaling",
                image_url=image_url,
                scale_factor=scale_factor
            )
            
            # Use Real-ESRGAN for upscaling
            api_request = {
                "version": "42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b",
                "input": {
                    "image": image_url,
                    "scale": scale_factor,
                    "face_enhance": enhance_face
                }
            }
            
            response = await self.replicate_client.post("/predictions", json=api_request)
            response.raise_for_status()
            
            prediction = response.json()
            prediction_id = prediction["id"]
            
            result_urls = await self._poll_prediction(prediction_id, job_id)
            
            if result_urls:
                # Get original image dimensions to calculate new size
                original_image = await self._get_image_info(image_url)
                new_width = original_image["width"] * scale_factor
                new_height = original_image["height"] * scale_factor
                
                upscaled_image = GeneratedImage(
                    url=result_urls[0],
                    width=new_width,
                    height=new_height,
                    seed=None
                )
                
                job_tracker.set_job_completed(job_id, result_urls[0])
                return upscaled_image
            else:
                raise Exception("Upscaling failed")
                
        except Exception as e:
            job_tracker.set_job_failed(job_id, str(e))
            raise
    
    async def inpaint_image(
        self,
        image_url: str,
        mask_url: str,
        prompt: str,
        style: ImageStyleEnum
    ) -> GeneratedImage:
        """Inpaint image using AI (remove/replace objects)"""
        job_id = self.generate_job_id()
        
        try:
            job_tracker.create_job(
                job_id=job_id,
                operation="image_inpainting",
                prompt=prompt,
                style=style.value
            )
            
            model_config = self.models[style]
            style_config = self.style_configs[style]
            
            enhanced_prompt = self._build_enhanced_prompt(prompt, style)
            negative_prompt = self._get_negative_prompt()
            
            # Use SDXL Inpainting
            api_request = {
                "version": "7de2ea26c616d5bf2245ad0d5e24f0ff9a6204578a5c876db53142edd9d2cd56",
                "input": {
                    "image": image_url,
                    "mask": mask_url,
                    "prompt": enhanced_prompt,
                    "negative_prompt": negative_prompt,
                    "num_inference_steps": model_config["steps"],
                    "guidance_scale": model_config["cfg_scale"],
                    "scheduler": style_config["scheduler"]
                }
            }
            
            response = await self.replicate_client.post("/predictions", json=api_request)
            response.raise_for_status()
            
            prediction = response.json()
            result_urls = await self._poll_prediction(prediction["id"], job_id)
            
            if result_urls:
                # Get original dimensions
                original_image = await self._get_image_info(image_url)
                
                inpainted_image = GeneratedImage(
                    url=result_urls[0],
                    width=original_image["width"],
                    height=original_image["height"],
                    seed=None
                )
                
                job_tracker.set_job_completed(job_id, result_urls[0])
                return inpainted_image
            else:
                raise Exception("Inpainting failed")
                
        except Exception as e:
            job_tracker.set_job_failed(job_id, str(e))
            raise
    
    async def generate_with_controlnet(
        self,
        prompt: str,
        control_image_url: str,
        control_type: str,  # "pose", "depth", "canny", "openpose"
        style: ImageStyleEnum,
        control_strength: float = 1.0
    ) -> GeneratedImage:
        """Generate image using ControlNet for precise control"""
        job_id = self.generate_job_id()
        
        try:
            job_tracker.create_job(
                job_id=job_id,
                operation="controlnet_generation",
                prompt=prompt,
                control_type=control_type,
                style=style.value
            )
            
            model_config = self.models[style]
            style_config = self.style_configs[style]
            
            enhanced_prompt = self._build_enhanced_prompt(prompt, style)
            negative_prompt = self._get_negative_prompt()
            
            # Choose appropriate ControlNet model
            controlnet_versions = {
                "pose": "controlnet-1.1-openpose-sdxl",
                "depth": "controlnet-1.1-depth-sdxl", 
                "canny": "controlnet-1.1-canny-sdxl",
                "openpose": "controlnet-1.1-openpose-sdxl"
            }
            
            api_request = {
                "version": controlnet_versions.get(control_type, controlnet_versions["pose"]),
                "input": {
                    "prompt": enhanced_prompt,
                    "negative_prompt": negative_prompt,
                    "image": control_image_url,
                    "conditioning_scale": control_strength,
                    "num_inference_steps": model_config["steps"],
                    "guidance_scale": model_config["cfg_scale"],
                    "scheduler": style_config["scheduler"]
                }
            }
            
            response = await self.replicate_client.post("/predictions", json=api_request)
            response.raise_for_status()
            
            prediction = response.json()
            result_urls = await self._poll_prediction(prediction["id"], job_id)
            
            if result_urls:
                control_image = await self._get_image_info(control_image_url)
                
                generated_image = GeneratedImage(
                    url=result_urls[0],
                    width=control_image["width"],
                    height=control_image["height"],
                    seed=None
                )
                
                job_tracker.set_job_completed(job_id, result_urls[0])
                return generated_image
            else:
                raise Exception("ControlNet generation failed")
                
        except Exception as e:
            job_tracker.set_job_failed(job_id, str(e))
            raise
    
    async def _get_image_info(self, image_url: str) -> Dict[str, Any]:
        """Get image dimensions and metadata"""
        try:
            response = await self.replicate_client.get(image_url)
            image_data = await response.aread()
            
            image = Image.open(io.BytesIO(image_data))
            return {
                "width": image.width,
                "height": image.height,
                "format": image.format,
                "mode": image.mode
            }
        except Exception:
            # Return default dimensions if unable to get info
            return {"width": 1024, "height": 1024, "format": "PNG", "mode": "RGB"}
    
    async def enhance_image_quality(self, image_url: str) -> GeneratedImage:
        """Enhance image quality using AI"""
        job_id = self.generate_job_id()
        
        try:
            job_tracker.create_job(
                job_id=job_id,
                operation="image_enhancement",
                image_url=image_url
            )
            
            # Use CodeFormer for face enhancement or GFPGAN
            api_request = {
                "version": "7de2ea26c616d5bf2245ad0d5e24f0ff9a6204578a5c876db53142edd9d2cd56",
                "input": {
                    "image": image_url,
                    "codeformer_fidelity": 0.7,
                    "background_enhance": True,
                    "face_upsample": True,
                    "upscale": 2
                }
            }
            
            response = await self.replicate_client.post("/predictions", json=api_request)
            response.raise_for_status()
            
            prediction = response.json()
            result_urls = await self._poll_prediction(prediction["id"], job_id)
            
            if result_urls:
                original_image = await self._get_image_info(image_url)
                
                enhanced_image = GeneratedImage(
                    url=result_urls[0],
                    width=original_image["width"] * 2,
                    height=original_image["height"] * 2,
                    seed=None
                )
                
                job_tracker.set_job_completed(job_id, result_urls[0])
                return enhanced_image
            else:
                raise Exception("Enhancement failed")
                
        except Exception as e:
            job_tracker.set_job_failed(job_id, str(e))
            raise
    
    async def generate_smart_variations(
        self,
        base_prompt: str,
        style: ImageStyleEnum,
        variation_types: List[str] = None,
        count: int = 4
    ) -> List[GeneratedImage]:
        """Generate smart variations using different techniques"""
        if variation_types is None:
            variation_types = ["style", "composition", "lighting", "color"]
        
        variations = []
        
        # Style variations
        if "style" in variation_types:
            style_prompts = [
                f"{base_prompt}, dramatic lighting",
                f"{base_prompt}, soft lighting", 
                f"{base_prompt}, vibrant colors",
                f"{base_prompt}, monochromatic"
            ]
            
            for prompt in style_prompts[:count//len(variation_types)]:
                request = ImageGenerationRequest(
                    prompt=prompt,
                    style=style,
                    batch_size=1,
                    seed=random.randint(0, 2**32 - 1)
                )
                
                response = await self.generate_images(request)
                if response.images:
                    variations.extend(response.images)
        
        # Composition variations
        if "composition" in variation_types:
            composition_prompts = [
                f"{base_prompt}, close-up view",
                f"{base_prompt}, wide angle view",
                f"{base_prompt}, bird's eye view",
                f"{base_prompt}, low angle view"
            ]
            
            for prompt in composition_prompts[:count//len(variation_types)]:
                request = ImageGenerationRequest(
                    prompt=prompt,
                    style=style,
                    batch_size=1,
                    seed=random.randint(0, 2**32 - 1)
                )
                
                response = await self.generate_images(request)
                if response.images:
                    variations.extend(response.images)
        
        return variations[:count]
    
    async def close(self):
        """Close the service and cleanup resources"""
        if self.replicate_client:
            await self.replicate_client.aclose()


# Global service instance
image_generation_service = ImageGenerationService()