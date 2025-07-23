"""
AI Banner Generator API endpoints
"""
from fastapi import APIRouter, HTTPException
import logging
from typing import List, Dict, Any
import asyncio
import aiohttp
from urllib.parse import urlparse
import re

from ..models.schemas import (
    BannerGeneratorRequest,
    BannerGeneratorResponse,
    GeneratedBanner
)
from ..services.text_generation import text_generation_service
from ..services.image_generation import image_generation_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/generate", response_model=BannerGeneratorResponse)
async def generate_banners(request: BannerGeneratorRequest):
    """Generate banner designs from brand information"""
    try:
        # Extract brand information if URL provided
        brand_info = {}
        if request.website_url:
            brand_info = await extract_brand_from_website(request.website_url)
        
        # Combine provided info with extracted info
        brand_name = request.brand_name
        product_description = request.product_description or brand_info.get("description", "")
        brand_colors = request.color_scheme or brand_info.get("colors", ["#2563eb", "#1d4ed8"])
        
        # Generate copy variations
        copy_variants = await generate_banner_copy(
            brand_name,
            product_description,
            request.include_cta
        )
        
        # Generate banners for each size
        banners = []
        for size in request.target_sizes:
            banner = await create_banner_design(
                brand_name,
                size,
                brand_colors,
                copy_variants,
                request.style_preference or "modern"
            )
            banners.append(banner)
        
        return BannerGeneratorResponse(
            banners=banners,
            brand_colors=brand_colors,
            suggested_fonts=["Inter", "Roboto", "Open Sans", "Montserrat"],
            generated_copy=copy_variants
        )
        
    except Exception as e:
        logger.error(f"Banner generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extract-brand")
async def extract_brand_info(website_url: str):
    """Extract brand information from website"""
    try:
        brand_info = await extract_brand_from_website(website_url)
        return brand_info
    except Exception as e:
        logger.error(f"Brand extraction error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


async def extract_brand_from_website(url: str) -> Dict[str, Any]:
    """Extract brand information from website"""
    try:
        # Validate URL
        parsed = urlparse(url)
        if not parsed.scheme:
            url = f"https://{url}"
        
        async with aiohttp.ClientSession() as session:
            async with session.get(
                url,
                timeout=aiohttp.ClientTimeout(total=10),
                headers={
                    'User-Agent': 'Mozilla/5.0 (compatible; BrandExtractor/1.0)'
                }
            ) as response:
                if response.status == 200:
                    html = await response.text()
                    return parse_brand_info(html, url)
                else:
                    logger.warning(f"Failed to fetch {url}: {response.status}")
                    return {}
                    
    except Exception as e:
        logger.error(f"Error extracting brand info: {str(e)}")
        return {}


def parse_brand_info(html: str, url: str) -> Dict[str, Any]:
    """Parse brand information from HTML"""
    brand_info = {}
    
    # Extract title
    title_match = re.search(r'<title[^>]*>([^<]+)</title>', html, re.IGNORECASE)
    if title_match:
        brand_info["title"] = title_match.group(1).strip()
    
    # Extract description from meta tags
    desc_match = re.search(
        r'<meta[^>]*name=["\']description["\'][^>]*content=["\']([^"\']+)["\']',
        html,
        re.IGNORECASE
    )
    if desc_match:
        brand_info["description"] = desc_match.group(1).strip()
    
    # Extract colors from CSS (simplified)
    color_matches = re.findall(r'(?:color|background(?:-color)?)\s*:\s*(#[0-9a-fA-F]{3,6})', html)
    if color_matches:
        # Get unique colors and limit to 5
        unique_colors = list(set(color_matches))[:5]
        brand_info["colors"] = unique_colors
    
    # Extract logo URL (simplified)
    logo_matches = re.findall(
        r'<img[^>]*(?:class=["\'][^"\']*logo[^"\']*["\']|alt=["\'][^"\']*logo[^"\']*["\'])[^>]*src=["\']([^"\']+)["\']',
        html,
        re.IGNORECASE
    )
    if logo_matches:
        brand_info["logo_url"] = logo_matches[0]
    
    return brand_info


async def generate_banner_copy(
    brand_name: str,
    product_description: str,
    include_cta: bool
) -> Dict[str, List[str]]:
    """Generate copy variations for banners"""
    try:
        # Generate headlines
        headlines = await text_generation_service.generate_text({
            "prompt": f"Create catchy headlines for {brand_name}",
            "context": product_description,
            "type": "headline",
            "tone": "confident",
            "max_length": 50,
            "num_variations": 5
        })
        
        # Generate taglines
        taglines = await text_generation_service.generate_text({
            "prompt": f"Create memorable taglines for {brand_name}",
            "context": product_description,
            "type": "tagline",
            "tone": "professional",
            "max_length": 30,
            "num_variations": 3
        })
        
        copy_variants = {
            "headlines": [h.text for h in headlines.variations],
            "taglines": [t.text for t in taglines.variations]
        }
        
        if include_cta:
            # Generate CTAs
            ctas = await text_generation_service.generate_text({
                "prompt": f"Create call-to-action buttons for {brand_name}",
                "type": "cta",
                "tone": "assertive",
                "max_length": 20,
                "num_variations": 5
            })
            copy_variants["ctas"] = [c.text for c in ctas.variations]
        
        return copy_variants
        
    except Exception as e:
        logger.error(f"Copy generation error: {str(e)}")
        # Return fallback copy
        return {
            "headlines": [f"Discover {brand_name}", f"Experience {brand_name}"],
            "taglines": ["Quality You Can Trust", "Innovation at Its Best"],
            "ctas": ["Learn More", "Get Started", "Shop Now"] if include_cta else []
        }


async def create_banner_design(
    brand_name: str,
    size: Dict[str, int],
    colors: List[str],
    copy_variants: Dict[str, List[str]],
    style: str
) -> GeneratedBanner:
    """Create banner design for specific size"""
    try:
        width = size["width"]
        height = size["height"]
        
        # Determine layout based on aspect ratio
        aspect_ratio = width / height
        is_horizontal = aspect_ratio > 1.2
        is_square = 0.8 <= aspect_ratio <= 1.2
        
        # Select appropriate copy
        headline = copy_variants["headlines"][0] if copy_variants["headlines"] else brand_name
        tagline = copy_variants["taglines"][0] if copy_variants["taglines"] else ""
        cta = copy_variants["ctas"][0] if copy_variants.get("ctas") else ""
        
        # Create design data structure
        design_data = {
            "canvas": {
                "width": width,
                "height": height,
                "background": colors[0] if colors else "#ffffff"
            },
            "objects": []
        }
        
        # Add background
        design_data["objects"].append({
            "type": "rect",
            "id": "background",
            "properties": {
                "x": 0,
                "y": 0,
                "width": width,
                "height": height,
                "fill": colors[0] if colors else "#2563eb",
                "opacity": 1
            }
        })
        
        # Add brand name
        headline_size = calculate_font_size(width, height, "headline")
        design_data["objects"].append({
            "type": "text",
            "id": "headline",
            "properties": {
                "x": width * 0.1,
                "y": height * 0.3,
                "width": width * 0.8,
                "height": headline_size * 1.2,
                "text": headline,
                "fontSize": headline_size,
                "fontFamily": "Inter",
                "fontWeight": "bold",
                "fill": "#ffffff",
                "textAlign": "center"
            }
        })
        
        # Add tagline if space allows
        if height > 150 and tagline:
            tagline_size = calculate_font_size(width, height, "tagline")
            design_data["objects"].append({
                "type": "text",
                "id": "tagline",
                "properties": {
                    "x": width * 0.1,
                    "y": height * 0.55,
                    "width": width * 0.8,
                    "height": tagline_size * 1.2,
                    "text": tagline,
                    "fontSize": tagline_size,
                    "fontFamily": "Inter",
                    "fontWeight": "normal",
                    "fill": "#ffffff",
                    "textAlign": "center",
                    "opacity": 0.9
                }
            })
        
        # Add CTA button if space allows and CTA provided
        if height > 200 and cta:
            button_width = min(width * 0.4, 150)
            button_height = min(height * 0.15, 40)
            
            # Button background
            design_data["objects"].append({
                "type": "rect",
                "id": "cta_button",
                "properties": {
                    "x": (width - button_width) / 2,
                    "y": height * 0.75,
                    "width": button_width,
                    "height": button_height,
                    "fill": colors[1] if len(colors) > 1 else "#ffffff",
                    "rx": 5,
                    "ry": 5
                }
            })
            
            # Button text
            cta_size = min(button_height * 0.4, 16)
            design_data["objects"].append({
                "type": "text",
                "id": "cta_text",
                "properties": {
                    "x": (width - button_width) / 2,
                    "y": height * 0.75 + (button_height - cta_size) / 2,
                    "width": button_width,
                    "height": cta_size * 1.2,
                    "text": cta,
                    "fontSize": cta_size,
                    "fontFamily": "Inter",
                    "fontWeight": "600",
                    "fill": colors[0] if colors else "#2563eb",
                    "textAlign": "center"
                }
            })
        
        # Generate thumbnail (placeholder)
        thumbnail = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
        
        return GeneratedBanner(
            size=size,
            design_data=design_data,
            thumbnail=thumbnail
        )
        
    except Exception as e:
        logger.error(f"Banner design creation error: {str(e)}")
        raise


def calculate_font_size(width: int, height: int, text_type: str) -> int:
    """Calculate appropriate font size based on banner dimensions"""
    area = width * height
    
    if text_type == "headline":
        # Headlines should be prominent
        base_size = min(width, height) * 0.08
        return max(14, min(48, int(base_size)))
    elif text_type == "tagline":
        # Taglines should be smaller
        base_size = min(width, height) * 0.04
        return max(10, min(24, int(base_size)))
    elif text_type == "cta":
        # CTAs should be readable but not overwhelming
        base_size = min(width, height) * 0.06
        return max(12, min(18, int(base_size)))
    
    return 16