"""
Background Removal Service using Remove.bg API or local rembg
"""
import aiohttp
import asyncio
from PIL import Image
import io
import base64
import logging
from typing import Optional, Tuple, Dict
import numpy as np
from rembg import remove as rembg_remove
from rembg.bg import remove as rembg_remove_with_model
import cv2

from ..config import settings
from ..models.schemas import BackgroundRemovalRequest, BackgroundRemovalResponse
from ..utils.cache import cache_result, get_cached_result
from ..utils.image_utils import image_to_base64, base64_to_image, apply_edge_refinement

logger = logging.getLogger(__name__)


class BackgroundRemovalService:
    """Service for removing backgrounds from images"""
    
    def __init__(self):
        self.removebg_api_key = settings.removebg_api_key
        self.use_local = settings.use_local_rembg
        
        # Available rembg models for different use cases
        self.local_models = {
            "general": "u2net",  # General purpose, good quality
            "human": "u2netp",  # Optimized for humans
            "object": "u2net_custom",  # Good for objects
            "clothing": "u2net_cloth_seg",  # Clothing items
            "animal": "u2net"  # Animals
        }
        
        if self.use_local:
            logger.info("Using local rembg for background removal")
        elif self.removebg_api_key:
            logger.info("Using Remove.bg API for background removal")
        else:
            logger.warning("No background removal method configured")
    
    async def remove_background(self, request: BackgroundRemovalRequest) -> BackgroundRemovalResponse:
        """Remove background from image"""
        try:
            # Check cache
            cache_key = f"bg_removal:{base64.b64encode(request.image_data.encode()).hexdigest()[:16]}"
            cached_result = await get_cached_result(cache_key)
            if cached_result:
                return BackgroundRemovalResponse(**cached_result)
            
            # Decode input image
            input_image = base64_to_image(request.image_data)
            
            # Remove background
            if self.use_local or not self.removebg_api_key:
                result_image, mask = await self._remove_background_local(
                    input_image,
                    request.model_type or "general"
                )
            else:
                result_image, mask = await self._remove_background_api(
                    request.image_data,
                    request.size or "auto",
                    request.type or "auto"
                )
            
            # Apply edge refinement if requested
            if request.edge_refinement:
                result_image = await apply_edge_refinement(
                    result_image,
                    mask,
                    feather=request.feather_radius or 2
                )
            
            # Convert result to base64
            result_data = image_to_base64(result_image, format="PNG")
            mask_data = image_to_base64(mask, format="PNG") if mask else None
            
            # Get image info
            width, height = result_image.size
            
            response = BackgroundRemovalResponse(
                image_data=result_data,
                mask_data=mask_data,
                width=width,
                height=height,
                format="PNG"
            )
            
            # Cache result
            await cache_result(cache_key, response.dict(), ttl=settings.ai_result_cache_ttl)
            
            return response
            
        except Exception as e:
            logger.error(f"Error removing background: {str(e)}")
            raise
    
    async def _remove_background_local(self, image: Image.Image, model_type: str) -> Tuple[Image.Image, Image.Image]:
        """Remove background using local rembg library"""
        try:
            # Select model based on type
            model_name = self.local_models.get(model_type, "u2net")
            
            # Convert PIL to bytes for rembg
            img_byte_arr = io.BytesIO()
            image.save(img_byte_arr, format='PNG')
            img_byte_arr = img_byte_arr.getvalue()
            
            # Run removal in thread pool to avoid blocking
            result_bytes = await asyncio.to_thread(
                rembg_remove,
                img_byte_arr,
                model=model_name,
                alpha_matting=True,  # Better edges
                alpha_matting_foreground_threshold=240,
                alpha_matting_background_threshold=10,
                alpha_matting_erode_size=10
            )
            
            # Convert back to PIL
            result_image = Image.open(io.BytesIO(result_bytes))
            
            # Extract alpha channel as mask
            if result_image.mode == 'RGBA':
                mask = result_image.split()[3]
            else:
                # Create mask from difference
                mask = self._create_mask_from_difference(image, result_image)
            
            return result_image, mask
            
        except Exception as e:
            logger.error(f"Local background removal error: {str(e)}")
            raise
    
    async def _remove_background_api(self, image_data: str, size: str, type_hint: str) -> Tuple[Image.Image, Image.Image]:
        """Remove background using Remove.bg API"""
        if not self.removebg_api_key:
            raise ValueError("Remove.bg API key not configured")
        
        try:
            url = "https://api.remove.bg/v1.0/removebg"
            
            # Prepare form data
            form_data = aiohttp.FormData()
            form_data.add_field('image_file_b64', image_data)
            form_data.add_field('size', size)
            form_data.add_field('type', type_hint)
            form_data.add_field('format', 'png')
            form_data.add_field('add_shadow', 'false')
            
            headers = {
                'X-Api-Key': self.removebg_api_key
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, data=form_data, headers=headers) as response:
                    if response.status == 200:
                        result_bytes = await response.read()
                        result_image = Image.open(io.BytesIO(result_bytes))
                        
                        # Extract mask from alpha channel
                        if result_image.mode == 'RGBA':
                            mask = result_image.split()[3]
                        else:
                            mask = None
                        
                        return result_image, mask
                    else:
                        error_data = await response.json()
                        raise Exception(f"Remove.bg API error: {error_data}")
                        
        except Exception as e:
            logger.error(f"Remove.bg API error: {str(e)}")
            raise
    
    def _create_mask_from_difference(self, original: Image.Image, processed: Image.Image) -> Image.Image:
        """Create a mask by comparing original and processed images"""
        # Convert to numpy arrays
        orig_array = np.array(original.convert('RGBA'))
        proc_array = np.array(processed.convert('RGBA'))
        
        # Create mask from alpha channel or difference
        if proc_array.shape[2] == 4:
            mask = proc_array[:, :, 3]
        else:
            # Simple difference-based mask
            diff = np.sum(np.abs(orig_array[:, :, :3] - proc_array[:, :, :3]), axis=2)
            mask = (diff > 30).astype(np.uint8) * 255
        
        return Image.fromarray(mask, mode='L')
    
    async def replace_background(
        self,
        foreground_data: str,
        background_data: str,
        blend_mode: str = "normal",
        opacity: float = 1.0
    ) -> BackgroundRemovalResponse:
        """Replace background with a new image"""
        try:
            # Remove background from foreground
            removal_request = BackgroundRemovalRequest(
                image_data=foreground_data,
                edge_refinement=True
            )
            removal_result = await self.remove_background(removal_request)
            
            # Load images
            foreground = base64_to_image(removal_result.image_data)
            background = base64_to_image(background_data)
            
            # Resize background to match foreground
            background = background.resize(foreground.size, Image.Resampling.LANCZOS)
            
            # Composite images
            if foreground.mode == 'RGBA':
                # Use alpha channel for compositing
                background.paste(foreground, (0, 0), foreground)
                result = background
            else:
                # Simple paste
                result = background.copy()
                result.paste(foreground, (0, 0))
            
            # Apply opacity if needed
            if opacity < 1.0:
                result = Image.blend(background, result, opacity)
            
            # Convert to base64
            result_data = image_to_base64(result, format="PNG")
            
            return BackgroundRemovalResponse(
                image_data=result_data,
                width=result.size[0],
                height=result.size[1],
                format="PNG"
            )
            
        except Exception as e:
            logger.error(f"Error replacing background: {str(e)}")
            raise


# Singleton instance
background_removal_service = BackgroundRemovalService()