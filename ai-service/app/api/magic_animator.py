"""
Magic Animator API endpoints
"""
from fastapi import APIRouter, HTTPException
import logging
from typing import List, Dict, Any

from ..models.schemas import (
    MagicAnimatorRequest,
    MagicAnimatorResponse,
    AnimationKeyframe,
    ObjectAnimation
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/magic", response_model=MagicAnimatorResponse)
async def magic_animate(request: MagicAnimatorRequest):
    """Generate animations automatically using AI"""
    try:
        # This is a simplified implementation
        # In production, this would use ML models to analyze the design
        
        animations = []
        duration = request.duration or 5000
        
        for i, obj in enumerate(request.canvas_objects):
            obj_id = obj.get('id', f'object_{i}')
            obj_type = obj.get('type', 'unknown')
            
            # Generate appropriate animation based on object type
            if obj_type == 'text':
                animation = create_text_animation(obj_id, duration, i)
            elif obj_type == 'image':
                animation = create_image_animation(obj_id, duration, i)
            elif obj_type in ['rect', 'circle', 'shape']:
                animation = create_shape_animation(obj_id, duration, i)
            else:
                animation = create_default_animation(obj_id, duration, i)
            
            animations.append(animation)
        
        return MagicAnimatorResponse(
            animations=animations,
            duration=duration,
            style=request.style or "dynamic"
        )
        
    except Exception as e:
        logger.error(f"Magic animation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/presets")
async def get_animation_presets():
    """Get available animation presets"""
    return {
        "entry": [
            {"id": "fadeIn", "name": "Fade In", "duration": 1000},
            {"id": "slideInLeft", "name": "Slide In Left", "duration": 800},
            {"id": "slideInRight", "name": "Slide In Right", "duration": 800},
            {"id": "slideInUp", "name": "Slide In Up", "duration": 800},
            {"id": "slideInDown", "name": "Slide In Down", "duration": 800},
            {"id": "zoomIn", "name": "Zoom In", "duration": 600},
            {"id": "bounceIn", "name": "Bounce In", "duration": 1000},
            {"id": "flipIn", "name": "Flip In", "duration": 800}
        ],
        "emphasis": [
            {"id": "pulse", "name": "Pulse", "duration": 1000},
            {"id": "shake", "name": "Shake", "duration": 500},
            {"id": "bounce", "name": "Bounce", "duration": 1000},
            {"id": "flash", "name": "Flash", "duration": 1000},
            {"id": "wobble", "name": "Wobble", "duration": 1000},
            {"id": "swing", "name": "Swing", "duration": 1000}
        ],
        "exit": [
            {"id": "fadeOut", "name": "Fade Out", "duration": 1000},
            {"id": "slideOutLeft", "name": "Slide Out Left", "duration": 800},
            {"id": "slideOutRight", "name": "Slide Out Right", "duration": 800},
            {"id": "zoomOut", "name": "Zoom Out", "duration": 600},
            {"id": "bounceOut", "name": "Bounce Out", "duration": 1000}
        ]
    }


@router.post("/apply-preset")
async def apply_animation_preset(
    object_id: str,
    preset_id: str,
    delay: int = 0,
    duration: int = 1000
) -> ObjectAnimation:
    """Apply a predefined animation preset to an object"""
    try:
        # Get preset definition
        preset = get_preset_definition(preset_id)
        if not preset:
            raise HTTPException(status_code=404, detail="Preset not found")
        
        # Create animation with preset
        keyframes = create_preset_keyframes(preset, duration)
        
        return ObjectAnimation(
            object_id=object_id,
            keyframes=keyframes,
            type=preset.get("type", "entry")
        )
        
    except Exception as e:
        logger.error(f"Preset application error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


def create_text_animation(obj_id: str, duration: int, index: int) -> ObjectAnimation:
    """Create animation for text objects"""
    delay = index * 200  # Stagger animations
    
    keyframes = [
        AnimationKeyframe(
            time=0,
            properties={"opacity": 0, "x": -50},
            easing="ease-out"
        ),
        AnimationKeyframe(
            time=delay + 600,
            properties={"opacity": 1, "x": 0},
            easing="ease-out"
        )
    ]
    
    return ObjectAnimation(
        object_id=obj_id,
        keyframes=keyframes,
        type="entry"
    )


def create_image_animation(obj_id: str, duration: int, index: int) -> ObjectAnimation:
    """Create animation for image objects"""
    delay = index * 300
    
    keyframes = [
        AnimationKeyframe(
            time=0,
            properties={"opacity": 0, "scaleX": 0.8, "scaleY": 0.8},
            easing="ease-out"
        ),
        AnimationKeyframe(
            time=delay + 800,
            properties={"opacity": 1, "scaleX": 1, "scaleY": 1},
            easing="ease-out"
        )
    ]
    
    return ObjectAnimation(
        object_id=obj_id,
        keyframes=keyframes,
        type="entry"
    )


def create_shape_animation(obj_id: str, duration: int, index: int) -> ObjectAnimation:
    """Create animation for shape objects"""
    delay = index * 150
    
    keyframes = [
        AnimationKeyframe(
            time=0,
            properties={"opacity": 0, "rotation": -90},
            easing="ease-out"
        ),
        AnimationKeyframe(
            time=delay + 500,
            properties={"opacity": 1, "rotation": 0},
            easing="ease-out"
        )
    ]
    
    return ObjectAnimation(
        object_id=obj_id,
        keyframes=keyframes,
        type="entry"
    )


def create_default_animation(obj_id: str, duration: int, index: int) -> ObjectAnimation:
    """Create default fade-in animation"""
    delay = index * 100
    
    keyframes = [
        AnimationKeyframe(
            time=0,
            properties={"opacity": 0},
            easing="ease-in-out"
        ),
        AnimationKeyframe(
            time=delay + 400,
            properties={"opacity": 1},
            easing="ease-in-out"
        )
    ]
    
    return ObjectAnimation(
        object_id=obj_id,
        keyframes=keyframes,
        type="entry"
    )


def get_preset_definition(preset_id: str) -> Dict[str, Any]:
    """Get animation preset definition"""
    presets = {
        "fadeIn": {
            "type": "entry",
            "properties": [
                {"time": 0, "opacity": 0},
                {"time": 1, "opacity": 1}
            ]
        },
        "slideInLeft": {
            "type": "entry",
            "properties": [
                {"time": 0, "opacity": 0, "x": -100},
                {"time": 1, "opacity": 1, "x": 0}
            ]
        },
        "zoomIn": {
            "type": "entry",
            "properties": [
                {"time": 0, "opacity": 0, "scaleX": 0.3, "scaleY": 0.3},
                {"time": 1, "opacity": 1, "scaleX": 1, "scaleY": 1}
            ]
        },
        "pulse": {
            "type": "emphasis",
            "properties": [
                {"time": 0, "scaleX": 1, "scaleY": 1},
                {"time": 0.5, "scaleX": 1.1, "scaleY": 1.1},
                {"time": 1, "scaleX": 1, "scaleY": 1}
            ]
        }
    }
    
    return presets.get(preset_id)


def create_preset_keyframes(preset: Dict[str, Any], duration: int) -> List[AnimationKeyframe]:
    """Create keyframes from preset definition"""
    keyframes = []
    
    for prop in preset.get("properties", []):
        time = int(prop.pop("time") * duration)
        keyframes.append(AnimationKeyframe(
            time=time,
            properties=prop,
            easing="ease-in-out"
        ))
    
    return keyframes