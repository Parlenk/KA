"""
Image processing utilities
"""
import base64
import io
import aiohttp
import asyncio
from PIL import Image, ImageFilter, ImageEnhance, ImageOps
import numpy as np
from typing import Tuple, Optional, Union
import logging

logger = logging.getLogger(__name__)


def image_to_base64(image: Image.Image, format: str = "PNG") -> str:
    """Convert PIL Image to base64 string"""
    buffer = io.BytesIO()
    image.save(buffer, format=format)
    return base64.b64encode(buffer.getvalue()).decode('utf-8')


def base64_to_image(base64_string: str) -> Image.Image:
    """Convert base64 string to PIL Image"""
    # Remove data URL prefix if present
    if base64_string.startswith('data:'):
        base64_string = base64_string.split(',')[1]
    
    image_data = base64.b64decode(base64_string)
    return Image.open(io.BytesIO(image_data))


async def download_image(url: str) -> bytes:
    """Download image from URL"""
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            if response.status == 200:
                return await response.read()
            else:
                raise Exception(f"Failed to download image: {response.status}")


async def resize_image(
    image: Image.Image, 
    max_width: int, 
    max_height: int,
    maintain_aspect: bool = True
) -> Image.Image:
    """Resize image to fit within max dimensions"""
    if maintain_aspect:
        image.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
        return image
    else:
        return image.resize((max_width, max_height), Image.Resampling.LANCZOS)


async def optimize_image(
    image_data: bytes,
    target_width: Optional[int] = None,
    target_height: Optional[int] = None,
    quality: int = 85
) -> bytes:
    """Optimize image for web delivery"""
    image = Image.open(io.BytesIO(image_data))
    
    # Convert RGBA to RGB if saving as JPEG
    if image.mode in ('RGBA', 'LA', 'P'):
        background = Image.new('RGB', image.size, (255, 255, 255))
        if image.mode == 'P':
            image = image.convert('RGBA')
        background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
        image = background
    
    # Resize if dimensions provided
    if target_width and target_height:
        image = await resize_image(image, target_width, target_height)
    
    # Save optimized
    buffer = io.BytesIO()
    image.save(buffer, format='JPEG', quality=quality, optimize=True)
    return buffer.getvalue()


async def apply_edge_refinement(
    image: Image.Image,
    mask: Optional[Image.Image] = None,
    feather: int = 2,
    smooth: bool = True
) -> Image.Image:
    """Apply edge refinement to cutout image"""
    if image.mode != 'RGBA':
        image = image.convert('RGBA')
    
    if mask:
        # Apply feathering to mask
        if feather > 0:
            mask = mask.filter(ImageFilter.GaussianBlur(radius=feather))
        
        # Apply mask to image
        image.putalpha(mask)
    
    if smooth:
        # Extract alpha channel
        alpha = image.split()[3]
        
        # Smooth edges
        alpha = alpha.filter(ImageFilter.SMOOTH_MORE)
        
        # Put back alpha
        image.putalpha(alpha)
    
    return image


def calculate_optimal_size(
    original_width: int,
    original_height: int,
    target_width: int,
    target_height: int,
    mode: str = "contain"
) -> Tuple[int, int]:
    """Calculate optimal size for resizing"""
    if mode == "contain":
        # Fit within bounds maintaining aspect ratio
        scale = min(target_width / original_width, target_height / original_height)
    elif mode == "cover":
        # Fill bounds maintaining aspect ratio
        scale = max(target_width / original_width, target_height / original_height)
    else:
        # Stretch to exact size
        return (target_width, target_height)
    
    new_width = int(original_width * scale)
    new_height = int(original_height * scale)
    
    return (new_width, new_height)


async def extract_dominant_colors(
    image: Union[Image.Image, str],
    num_colors: int = 5,
    quality: int = 10
) -> list:
    """Extract dominant colors from image"""
    if isinstance(image, str):
        image = base64_to_image(image)
    
    # Resize for faster processing
    image = image.copy()
    image.thumbnail((150, 150))
    
    # Convert to RGB if needed
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    # Get pixels
    pixels = list(image.getdata())
    
    # Simple k-means clustering
    from sklearn.cluster import KMeans
    import numpy as np
    
    pixels_array = np.array(pixels)
    kmeans = KMeans(n_clusters=num_colors, random_state=42, n_init=10)
    kmeans.fit(pixels_array)
    
    # Get colors
    colors = kmeans.cluster_centers_.astype(int)
    
    # Convert to hex
    hex_colors = ['#{:02x}{:02x}{:02x}'.format(r, g, b) for r, g, b in colors]
    
    return hex_colors


async def create_thumbnail(
    image: Union[Image.Image, str],
    size: Tuple[int, int] = (256, 256)
) -> str:
    """Create thumbnail and return as base64"""
    if isinstance(image, str):
        image = base64_to_image(image)
    
    # Create thumbnail
    thumbnail = image.copy()
    thumbnail.thumbnail(size, Image.Resampling.LANCZOS)
    
    # Convert to base64
    return image_to_base64(thumbnail, format="JPEG")


def apply_image_filter(image: Image.Image, filter_name: str) -> Image.Image:
    """Apply various image filters"""
    filters = {
        "blur": ImageFilter.BLUR,
        "contour": ImageFilter.CONTOUR,
        "detail": ImageFilter.DETAIL,
        "edge_enhance": ImageFilter.EDGE_ENHANCE,
        "edge_enhance_more": ImageFilter.EDGE_ENHANCE_MORE,
        "emboss": ImageFilter.EMBOSS,
        "find_edges": ImageFilter.FIND_EDGES,
        "sharpen": ImageFilter.SHARPEN,
        "smooth": ImageFilter.SMOOTH,
        "smooth_more": ImageFilter.SMOOTH_MORE
    }
    
    if filter_name.lower() in filters:
        return image.filter(filters[filter_name.lower()])
    
    return image


def adjust_image_properties(
    image: Image.Image,
    brightness: float = 1.0,
    contrast: float = 1.0,
    saturation: float = 1.0,
    sharpness: float = 1.0
) -> Image.Image:
    """Adjust image properties"""
    # Brightness
    if brightness != 1.0:
        enhancer = ImageEnhance.Brightness(image)
        image = enhancer.enhance(brightness)
    
    # Contrast
    if contrast != 1.0:
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(contrast)
    
    # Saturation
    if saturation != 1.0:
        enhancer = ImageEnhance.Color(image)
        image = enhancer.enhance(saturation)
    
    # Sharpness
    if sharpness != 1.0:
        enhancer = ImageEnhance.Sharpness(image)
        image = enhancer.enhance(sharpness)
    
    return image


async def smart_crop(
    image: Image.Image,
    target_width: int,
    target_height: int,
    focus_point: Optional[Tuple[int, int]] = None
) -> Image.Image:
    """Smart crop image to target dimensions"""
    current_width, current_height = image.size
    target_ratio = target_width / target_height
    current_ratio = current_width / current_height
    
    if current_ratio > target_ratio:
        # Image is wider, crop width
        new_width = int(current_height * target_ratio)
        if focus_point:
            left = max(0, min(focus_point[0] - new_width // 2, current_width - new_width))
        else:
            left = (current_width - new_width) // 2
        image = image.crop((left, 0, left + new_width, current_height))
    else:
        # Image is taller, crop height
        new_height = int(current_width / target_ratio)
        if focus_point:
            top = max(0, min(focus_point[1] - new_height // 2, current_height - new_height))
        else:
            top = (current_height - new_height) // 2
        image = image.crop((0, top, current_width, top + new_height))
    
    # Resize to exact dimensions
    return image.resize((target_width, target_height), Image.Resampling.LANCZOS)