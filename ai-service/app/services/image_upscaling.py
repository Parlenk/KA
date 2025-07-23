"""
Image Upscaling Service using Real-ESRGAN via Replicate
"""
import replicate
import asyncio
from PIL import Image
import io
import base64
import logging
from typing import Optional, Tuple
import numpy as np

from ..config import settings
from ..models.schemas import ImageUpscaleRequest, ImageUpscaleResponse
from ..utils.cache import cache_result, get_cached_result
from ..utils.image_utils import (
    base64_to_image, 
    image_to_base64, 
    download_image,
    calculate_optimal_size
)

logger = logging.getLogger(__name__)


class ImageUpscalingService:
    """Service for upscaling images using AI"""
    
    def __init__(self):
        if settings.replicate_api_token:
            self.client = replicate.Client(api_token=settings.replicate_api_token)
        else:
            self.client = None
            logger.warning("Replicate API token not configured for upscaling")
        
        self.model_version = settings.upscale_model
        self.max_dimension = 2000  # Maximum output dimension
    
    async def upscale_image(self, request: ImageUpscaleRequest) -> ImageUpscaleResponse:
        """Upscale an image using Real-ESRGAN"""
        try:
            # Check cache
            cache_key = f"upscale:{base64.b64encode(request.image_data.encode()).hexdigest()[:16]}:{request.scale}"
            cached_result = await get_cached_result(cache_key)
            if cached_result:
                return ImageUpscaleResponse(**cached_result)
            
            # Decode input image
            input_image = base64_to_image(request.image_data)
            original_width, original_height = input_image.size
            
            # Calculate target size
            scale = request.scale or 2
            target_width = int(original_width * scale)
            target_height = int(original_height * scale)
            
            # Enforce maximum dimensions
            if target_width > self.max_dimension or target_height > self.max_dimension:
                # Calculate scale to fit within max dimensions
                scale_w = self.max_dimension / original_width
                scale_h = self.max_dimension / original_height
                actual_scale = min(scale_w, scale_h)
                target_width = int(original_width * actual_scale)
                target_height = int(original_height * actual_scale)
                logger.info(f"Adjusted scale from {scale}x to {actual_scale:.2f}x to fit within {self.max_dimension}px")
            
            # Upscale the image
            if self.client:
                upscaled_image = await self._upscale_with_replicate(
                    request.image_data,
                    scale,
                    request.face_enhance or False
                )
            else:
                # Fallback to simple resize if no API available
                upscaled_image = input_image.resize(
                    (target_width, target_height),
                    Image.Resampling.LANCZOS
                )
            
            # Apply post-processing if requested
            if request.denoise:
                upscaled_image = await self._apply_denoising(upscaled_image)
            
            if request.sharpen:
                upscaled_image = await self._apply_sharpening(upscaled_image)
            
            # Convert to base64
            result_data = image_to_base64(upscaled_image, format=request.output_format or "PNG")
            
            # Get actual dimensions
            final_width, final_height = upscaled_image.size
            
            response = ImageUpscaleResponse(
                image_data=result_data,
                original_width=original_width,
                original_height=original_height,
                upscaled_width=final_width,
                upscaled_height=final_height,
                actual_scale=final_width / original_width,
                format=request.output_format or "PNG"
            )
            
            # Cache result
            await cache_result(cache_key, response.dict(), ttl=settings.ai_result_cache_ttl)
            
            return response
            
        except Exception as e:
            logger.error(f"Error upscaling image: {str(e)}")
            raise
    
    async def _upscale_with_replicate(
        self,
        image_data: str,
        scale: int,
        face_enhance: bool
    ) -> Image.Image:
        """Upscale using Real-ESRGAN via Replicate"""
        if not self.client:
            raise ValueError("Replicate client not initialized")
        
        try:
            # Run the upscaling model
            output = await asyncio.to_thread(
                self.client.run,
                self.model_version,
                input={
                    "image": f"data:image/png;base64,{image_data}",
                    "scale": scale,
                    "face_enhance": face_enhance,
                    "tile": 0,  # Process whole image at once
                    "tile_pad": 10,
                    "pre_pad": 0
                }
            )
            
            # Download the result
            if isinstance(output, str):
                image_data = await download_image(output)
                return Image.open(io.BytesIO(image_data))
            else:
                # Handle direct image data
                return Image.open(io.BytesIO(output))
                
        except Exception as e:
            logger.error(f"Replicate upscaling error: {str(e)}")
            raise
    
    async def _apply_denoising(self, image: Image.Image) -> Image.Image:
        """Apply denoising to the image"""
        try:
            # Convert to numpy array
            img_array = np.array(image)
            
            # Apply bilateral filter for edge-preserving denoising
            import cv2
            denoised = await asyncio.to_thread(
                cv2.bilateralFilter,
                img_array,
                d=9,
                sigmaColor=75,
                sigmaSpace=75
            )
            
            return Image.fromarray(denoised)
            
        except Exception as e:
            logger.warning(f"Denoising failed: {str(e)}")
            return image
    
    async def _apply_sharpening(self, image: Image.Image) -> Image.Image:
        """Apply sharpening to the image"""
        try:
            from PIL import ImageFilter, ImageEnhance
            
            # Apply unsharp mask
            sharpened = image.filter(ImageFilter.UnsharpMask(radius=1, percent=150, threshold=3))
            
            # Enhance contrast slightly
            enhancer = ImageEnhance.Contrast(sharpened)
            sharpened = enhancer.enhance(1.1)
            
            return sharpened
            
        except Exception as e:
            logger.warning(f"Sharpening failed: {str(e)}")
            return image
    
    async def batch_upscale(
        self,
        images: List[str],
        scale: int = 2,
        options: Optional[Dict] = None
    ) -> List[ImageUpscaleResponse]:
        """Upscale multiple images in batch"""
        try:
            # Process images concurrently
            tasks = []
            for image_data in images:
                request = ImageUpscaleRequest(
                    image_data=image_data,
                    scale=scale,
                    face_enhance=options.get("face_enhance", False) if options else False,
                    denoise=options.get("denoise", False) if options else False,
                    sharpen=options.get("sharpen", False) if options else False
                )
                tasks.append(self.upscale_image(request))
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Filter out errors
            successful_results = []
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    logger.error(f"Failed to upscale image {i}: {str(result)}")
                else:
                    successful_results.append(result)
            
            return successful_results
            
        except Exception as e:
            logger.error(f"Batch upscaling error: {str(e)}")
            raise
    
    async def smart_upscale(
        self,
        image_data: str,
        target_width: int,
        target_height: int
    ) -> ImageUpscaleResponse:
        """Intelligently upscale to specific dimensions"""
        try:
            # Get original dimensions
            input_image = base64_to_image(image_data)
            orig_width, orig_height = input_image.size
            
            # Calculate optimal scale
            scale_w = target_width / orig_width
            scale_h = target_height / orig_height
            scale = min(scale_w, scale_h)
            
            # Round to nearest integer scale for better quality
            if scale <= 2:
                scale = 2
            elif scale <= 3:
                scale = 3
            else:
                scale = 4
            
            # Upscale
            request = ImageUpscaleRequest(
                image_data=image_data,
                scale=scale,
                face_enhance=True,  # Auto-detect faces
                denoise=True,
                sharpen=True
            )
            result = await self.upscale_image(request)
            
            # Resize to exact dimensions if needed
            if result.upscaled_width != target_width or result.upscaled_height != target_height:
                upscaled_img = base64_to_image(result.image_data)
                final_img = upscaled_img.resize(
                    (target_width, target_height),
                    Image.Resampling.LANCZOS
                )
                result.image_data = image_to_base64(final_img)
                result.upscaled_width = target_width
                result.upscaled_height = target_height
            
            return result
            
        except Exception as e:
            logger.error(f"Smart upscaling error: {str(e)}")
            raise


# Singleton instance
image_upscaling_service = ImageUpscalingService()