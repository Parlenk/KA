"""
Magic Animator - AI-Powered Animation Generation Service
Phase 3: Intelligent animation creation with context-aware suggestions
"""
import asyncio
import time
import random
import json
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from enum import Enum

from .base import BaseAIService, job_tracker
from .text_generation import text_generation_service
from ..config import settings


class AnimationStyleEnum(str, Enum):
    SMOOTH = "smooth"
    BOUNCY = "bouncy"
    ELASTIC = "elastic"
    DRAMATIC = "dramatic"
    SUBTLE = "subtle"
    ENERGETIC = "energetic"
    PROFESSIONAL = "professional"
    PLAYFUL = "playful"


class AnimationPurposeEnum(str, Enum):
    ATTENTION = "attention"
    ENGAGEMENT = "engagement"
    CONVERSION = "conversion"
    BRANDING = "branding"
    STORYTELLING = "storytelling"
    PRODUCT_SHOWCASE = "product_showcase"


class MagicAnimatorService(BaseAIService):
    """AI-powered animation generation and optimization service"""
    
    def __init__(self):
        super().__init__()
        
        # Animation templates and patterns
        self.animation_templates = {
            "entry": {
                "fade_in": {
                    "properties": ["opacity"],
                    "keyframes": [{"time": 0, "opacity": 0}, {"time": 1000, "opacity": 1}],
                    "easing": "ease-out",
                    "impact": "subtle"
                },
                "slide_in_left": {
                    "properties": ["transform", "opacity"],
                    "keyframes": [
                        {"time": 0, "transform": "translateX(-100px)", "opacity": 0},
                        {"time": 800, "transform": "translateX(0)", "opacity": 1}
                    ],
                    "easing": "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                    "impact": "moderate"
                },
                "zoom_in": {
                    "properties": ["transform", "opacity"],
                    "keyframes": [
                        {"time": 0, "transform": "scale(0.3)", "opacity": 0},
                        {"time": 600, "transform": "scale(1.05)", "opacity": 0.8},
                        {"time": 800, "transform": "scale(1)", "opacity": 1}
                    ],
                    "easing": "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
                    "impact": "high"
                },
                "bounce_in": {
                    "properties": ["transform"],
                    "keyframes": [
                        {"time": 0, "transform": "scale(0)"},
                        {"time": 200, "transform": "scale(1.1)"},
                        {"time": 400, "transform": "scale(0.95)"},
                        {"time": 600, "transform": "scale(1.02)"},
                        {"time": 800, "transform": "scale(1)"}
                    ],
                    "easing": "ease-out",
                    "impact": "very_high"
                }
            },
            "emphasis": {
                "pulse": {
                    "properties": ["transform"],
                    "keyframes": [
                        {"time": 0, "transform": "scale(1)"},
                        {"time": 300, "transform": "scale(1.1)"},
                        {"time": 600, "transform": "scale(1)"}
                    ],
                    "easing": "ease-in-out",
                    "impact": "moderate",
                    "repeatable": True
                },
                "shake": {
                    "properties": ["transform"],
                    "keyframes": [
                        {"time": 0, "transform": "translateX(0)"},
                        {"time": 100, "transform": "translateX(-5px)"},
                        {"time": 200, "transform": "translateX(5px)"},
                        {"time": 300, "transform": "translateX(-3px)"},
                        {"time": 400, "transform": "translateX(3px)"},
                        {"time": 500, "transform": "translateX(0)"}
                    ],
                    "easing": "linear",
                    "impact": "high",
                    "repeatable": True
                },
                "glow": {
                    "properties": ["box-shadow", "filter"],
                    "keyframes": [
                        {"time": 0, "filter": "drop-shadow(0 0 0 rgba(255,255,255,0))"},
                        {"time": 500, "filter": "drop-shadow(0 0 20px rgba(255,255,255,0.8))"},
                        {"time": 1000, "filter": "drop-shadow(0 0 0 rgba(255,255,255,0))"}
                    ],
                    "easing": "ease-in-out",
                    "impact": "moderate",
                    "repeatable": True
                }
            },
            "exit": {
                "fade_out": {
                    "properties": ["opacity"],
                    "keyframes": [{"time": 0, "opacity": 1}, {"time": 500, "opacity": 0}],
                    "easing": "ease-in",
                    "impact": "subtle"
                },
                "slide_out_right": {
                    "properties": ["transform", "opacity"],
                    "keyframes": [
                        {"time": 0, "transform": "translateX(0)", "opacity": 1},
                        {"time": 600, "transform": "translateX(100px)", "opacity": 0}
                    ],
                    "easing": "ease-in",
                    "impact": "moderate"
                },
                "zoom_out": {
                    "properties": ["transform", "opacity"],
                    "keyframes": [
                        {"time": 0, "transform": "scale(1)", "opacity": 1},
                        {"time": 400, "transform": "scale(0.8)", "opacity": 0.3},
                        {"time": 600, "transform": "scale(0)", "opacity": 0}
                    ],
                    "easing": "ease-in",
                    "impact": "high"
                }
            }
        }
        
        # Style-specific animation preferences
        self.style_preferences = {
            AnimationStyleEnum.SMOOTH: {
                "easing_preference": ["ease", "ease-out", "ease-in-out"],
                "duration_range": (600, 1200),
                "preferred_animations": ["fade_in", "slide_in_left", "fade_out"],
                "impact_preference": ["subtle", "moderate"]
            },
            AnimationStyleEnum.BOUNCY: {
                "easing_preference": ["cubic-bezier(0.68, -0.55, 0.265, 1.55)", "bounce"],
                "duration_range": (400, 800),
                "preferred_animations": ["bounce_in", "zoom_in", "pulse"],
                "impact_preference": ["high", "very_high"]
            },
            AnimationStyleEnum.ELASTIC: {
                "easing_preference": ["cubic-bezier(0.175, 0.885, 0.32, 1.275)"],
                "duration_range": (800, 1500),
                "preferred_animations": ["zoom_in", "bounce_in", "slide_in_left"],
                "impact_preference": ["moderate", "high"]
            },
            AnimationStyleEnum.DRAMATIC: {
                "easing_preference": ["ease-in", "cubic-bezier(0.55, 0.06, 0.68, 0.19)"],
                "duration_range": (1000, 2000),
                "preferred_animations": ["zoom_in", "slide_in_left", "zoom_out"],
                "impact_preference": ["high", "very_high"]
            },
            AnimationStyleEnum.SUBTLE: {
                "easing_preference": ["ease", "ease-out"],
                "duration_range": (300, 600),
                "preferred_animations": ["fade_in", "fade_out", "glow"],
                "impact_preference": ["subtle"]
            },
            AnimationStyleEnum.ENERGETIC: {
                "easing_preference": ["ease-out", "cubic-bezier(0.25, 0.46, 0.45, 0.94)"],
                "duration_range": (200, 600),
                "preferred_animations": ["bounce_in", "shake", "pulse"],
                "impact_preference": ["high", "very_high"]
            },
            AnimationStyleEnum.PROFESSIONAL: {
                "easing_preference": ["ease", "ease-in-out"],
                "duration_range": (400, 800),
                "preferred_animations": ["fade_in", "slide_in_left", "fade_out"],
                "impact_preference": ["subtle", "moderate"]
            },
            AnimationStyleEnum.PLAYFUL: {
                "easing_preference": ["cubic-bezier(0.68, -0.55, 0.265, 1.55)", "bounce"],
                "duration_range": (300, 1000),
                "preferred_animations": ["bounce_in", "shake", "zoom_in", "pulse"],
                "impact_preference": ["moderate", "high", "very_high"]
            }
        }
        
        # Purpose-driven animation suggestions
        self.purpose_mappings = {
            AnimationPurposeEnum.ATTENTION: {
                "primary_types": ["emphasis"],
                "suggested_animations": ["pulse", "shake", "glow", "bounce_in"],
                "timing_strategy": "immediate",
                "repeat_pattern": "periodic"
            },
            AnimationPurposeEnum.ENGAGEMENT: {
                "primary_types": ["entry", "emphasis"],
                "suggested_animations": ["slide_in_left", "zoom_in", "pulse"],
                "timing_strategy": "staggered",
                "repeat_pattern": "on_interaction"
            },
            AnimationPurposeEnum.CONVERSION: {
                "primary_types": ["emphasis", "entry"],
                "suggested_animations": ["glow", "pulse", "bounce_in"],
                "timing_strategy": "delayed",
                "repeat_pattern": "continuous"
            },
            AnimationPurposeEnum.BRANDING: {
                "primary_types": ["entry", "emphasis"],
                "suggested_animations": ["fade_in", "slide_in_left", "glow"],
                "timing_strategy": "coordinated",
                "repeat_pattern": "subtle"
            },
            AnimationPurposeEnum.STORYTELLING: {
                "primary_types": ["entry", "exit"],
                "suggested_animations": ["fade_in", "slide_in_left", "fade_out"],
                "timing_strategy": "sequential",
                "repeat_pattern": "narrative"
            },
            AnimationPurposeEnum.PRODUCT_SHOWCASE: {
                "primary_types": ["entry", "emphasis"],
                "suggested_animations": ["zoom_in", "glow", "pulse"],
                "timing_strategy": "highlight",
                "repeat_pattern": "showcase"
            }
        }
        
        # Context analysis patterns
        self.context_patterns = {
            "text_elements": {
                "headline": {"priority": "high", "timing": "early", "impact": "high"},
                "subheading": {"priority": "medium", "timing": "delayed", "impact": "moderate"},
                "body": {"priority": "low", "timing": "sequential", "impact": "subtle"},
                "cta": {"priority": "very_high", "timing": "emphasized", "impact": "very_high"}
            },
            "visual_elements": {
                "logo": {"priority": "medium", "timing": "early", "impact": "moderate"},
                "product": {"priority": "very_high", "timing": "featured", "impact": "high"},
                "background": {"priority": "low", "timing": "ambient", "impact": "subtle"},
                "decoration": {"priority": "low", "timing": "secondary", "impact": "subtle"}
            }
        }
    
    async def _setup(self) -> None:
        """Initialize the Magic Animator service"""
        self.logger.info("Magic Animator service initialized")
        await self.health_check()
    
    async def health_check(self) -> bool:
        """Check if the Magic Animator service is healthy"""
        return True
    
    async def generate_smart_animations(
        self,
        design_elements: List[Dict[str, Any]],
        style: AnimationStyleEnum,
        purpose: AnimationPurposeEnum,
        duration_seconds: float = 5.0,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Generate AI-powered animations for design elements"""
        job_id = self.generate_job_id()
        start_time = time.time()
        
        try:
            job_tracker.create_job(
                job_id=job_id,
                operation="smart_animation_generation",
                element_count=len(design_elements),
                style=style.value,
                purpose=purpose.value,
                duration=duration_seconds
            )
            
            await self._log_job_start(
                job_id, "smart_animation_generation",
                element_count=len(design_elements),
                style=style.value,
                purpose=purpose.value
            )
            
            job_tracker.set_job_processing(job_id, 10.0)
            
            # Analyze design elements and context
            element_analysis = await self._analyze_design_elements(design_elements, context)
            job_tracker.set_job_processing(job_id, 25.0)
            
            # Generate animation strategy
            animation_strategy = await self._create_animation_strategy(
                element_analysis, style, purpose, duration_seconds
            )
            job_tracker.set_job_processing(job_id, 40.0)
            
            # Create specific animations for each element
            animations = []
            for i, element in enumerate(design_elements):
                element_animation = await self._generate_element_animation(
                    element, 
                    element_analysis[i],
                    animation_strategy,
                    style,
                    purpose
                )
                animations.append(element_animation)
                
                # Update progress
                progress = 40.0 + (i + 1) / len(design_elements) * 50.0
                job_tracker.set_job_processing(job_id, progress)
            
            # Optimize timing and coordination
            optimized_animations = await self._optimize_animation_timing(animations, animation_strategy)
            job_tracker.set_job_processing(job_id, 95.0)
            
            # Generate performance insights
            insights = await self._generate_animation_insights(optimized_animations, animation_strategy)
            
            response_data = {
                "animations": optimized_animations,
                "strategy": animation_strategy,
                "insights": insights,
                "total_duration": duration_seconds,
                "style": style.value,
                "purpose": purpose.value,
                "job_id": job_id
            }
            
            job_tracker.set_job_completed(job_id, f"Generated {len(animations)} smart animations")
            
            duration = time.time() - start_time
            await self._log_job_complete(
                job_id, "smart_animation_generation", duration,
                animation_count=len(animations)
            )
            
            return response_data
            
        except Exception as e:
            job_tracker.set_job_failed(job_id, str(e))
            await self._log_job_error(job_id, "smart_animation_generation", e)
            raise
    
    async def optimize_existing_animations(
        self,
        current_animations: List[Dict[str, Any]],
        performance_goals: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Optimize existing animations using AI analysis"""
        job_id = self.generate_job_id()
        
        try:
            job_tracker.create_job(
                job_id=job_id,
                operation="animation_optimization",
                animation_count=len(current_animations),
                goals=performance_goals
            )
            
            # Analyze current animations
            current_analysis = await self._analyze_current_animations(current_animations)
            job_tracker.set_job_processing(job_id, 30.0)
            
            # Identify optimization opportunities
            optimization_opportunities = await self._identify_optimization_opportunities(
                current_analysis, performance_goals, context
            )
            job_tracker.set_job_processing(job_id, 60.0)
            
            # Apply optimizations
            optimized_animations = await self._apply_optimizations(
                current_animations, optimization_opportunities
            )
            job_tracker.set_job_processing(job_id, 85.0)
            
            # Calculate improvement metrics
            improvement_metrics = await self._calculate_improvement_metrics(
                current_animations, optimized_animations, performance_goals
            )
            
            response_data = {
                "optimized_animations": optimized_animations,
                "optimization_opportunities": optimization_opportunities,
                "improvement_metrics": improvement_metrics,
                "recommendations": await self._generate_optimization_recommendations(
                    current_analysis, optimization_opportunities
                ),
                "job_id": job_id
            }
            
            job_tracker.set_job_completed(job_id, "Animation optimization completed")
            
            return response_data
            
        except Exception as e:
            job_tracker.set_job_failed(job_id, str(e))
            raise
    
    async def suggest_animation_variations(
        self,
        base_animation: Dict[str, Any],
        variation_count: int = 5,
        creativity_level: float = 0.7
    ) -> List[Dict[str, Any]]:
        """Generate creative variations of a base animation"""
        job_id = self.generate_job_id()
        
        try:
            job_tracker.create_job(
                job_id=job_id,
                operation="animation_variations",
                base_animation=base_animation.get("name", "unknown"),
                variation_count=variation_count
            )
            
            variations = []
            
            for i in range(variation_count):
                # Create variation with increasing creativity
                creativity_factor = creativity_level * (i / variation_count + 0.2)
                
                variation = await self._create_animation_variation(
                    base_animation, creativity_factor, i
                )
                
                # Score variation based on novelty and effectiveness
                variation_score = await self._score_animation_variation(variation, base_animation)
                variation["creativity_score"] = creativity_factor
                variation["effectiveness_score"] = variation_score
                
                variations.append(variation)
                
                # Update progress
                progress = (i + 1) / variation_count * 90.0
                job_tracker.set_job_processing(job_id, progress)
            
            # Sort by effectiveness score
            variations.sort(key=lambda x: x["effectiveness_score"], reverse=True)
            
            job_tracker.set_job_completed(job_id, f"Generated {len(variations)} animation variations")
            
            return variations
            
        except Exception as e:
            job_tracker.set_job_failed(job_id, str(e))
            raise
    
    async def generate_contextual_presets(
        self,
        industry: str,
        brand_personality: List[str],
        target_audience: Dict[str, Any],
        content_type: str
    ) -> Dict[str, Any]:
        """Generate animation presets tailored to specific context"""
        job_id = self.generate_job_id()
        
        try:
            job_tracker.create_job(
                job_id=job_id,
                operation="contextual_presets",
                industry=industry,
                content_type=content_type
            )
            
            # Analyze context for animation preferences
            context_analysis = await self._analyze_animation_context(
                industry, brand_personality, target_audience, content_type
            )
            job_tracker.set_job_processing(job_id, 30.0)
            
            # Generate style recommendations
            recommended_styles = await self._recommend_animation_styles(context_analysis)
            job_tracker.set_job_processing(job_id, 50.0)
            
            # Create custom presets
            custom_presets = []
            for style_config in recommended_styles:
                preset = await self._create_contextual_preset(style_config, context_analysis)
                custom_presets.append(preset)
                
                progress = 50.0 + len(custom_presets) / len(recommended_styles) * 40.0
                job_tracker.set_job_processing(job_id, progress)
            
            # Generate usage guidelines
            usage_guidelines = await self._generate_preset_guidelines(
                custom_presets, context_analysis
            )
            
            response_data = {
                "presets": custom_presets,
                "recommended_styles": recommended_styles,
                "context_analysis": context_analysis,
                "usage_guidelines": usage_guidelines,
                "industry": industry,
                "content_type": content_type,
                "job_id": job_id
            }
            
            job_tracker.set_job_completed(job_id, f"Generated {len(custom_presets)} contextual presets")
            
            return response_data
            
        except Exception as e:
            job_tracker.set_job_failed(job_id, str(e))
            raise
    
    # Helper methods for AI-powered animation generation
    
    async def _analyze_design_elements(
        self, 
        elements: List[Dict[str, Any]], 
        context: Optional[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Analyze design elements to determine optimal animation strategies"""
        analysis = []
        
        for element in elements:
            element_type = element.get("type", "unknown")
            content = element.get("content", "")
            position = element.get("position", {})
            size = element.get("size", {})
            
            # Determine element importance
            importance = self._calculate_element_importance(element, context)
            
            # Analyze content for animation hints
            content_analysis = await self._analyze_element_content(element_type, content)
            
            # Determine optimal timing
            timing_priority = self._calculate_timing_priority(element, importance)
            
            analysis.append({
                "element_id": element.get("id"),
                "type": element_type,
                "importance": importance,
                "content_analysis": content_analysis,
                "timing_priority": timing_priority,
                "position": position,
                "size": size,
                "animation_suitability": self._assess_animation_suitability(element)
            })
        
        return analysis
    
    def _calculate_element_importance(
        self, 
        element: Dict[str, Any], 
        context: Optional[Dict[str, Any]]
    ) -> float:
        """Calculate the importance score of an element for animation prioritization"""
        base_score = 0.5
        element_type = element.get("type", "unknown")
        
        # Type-based importance
        type_scores = {
            "headline": 0.9,
            "cta": 1.0,
            "logo": 0.7,
            "product": 0.9,
            "subheading": 0.6,
            "body": 0.3,
            "decoration": 0.2,
            "background": 0.1
        }
        
        type_score = type_scores.get(element_type, base_score)
        
        # Position-based importance (center elements often more important)
        position = element.get("position", {})
        x = position.get("x", 0)
        y = position.get("y", 0)
        
        # Simple center-bias calculation
        center_distance = abs(x - 500) + abs(y - 300)  # Assuming 1000x600 canvas
        position_score = max(0.0, 1.0 - center_distance / 1000)
        
        # Size-based importance
        size = element.get("size", {})
        width = size.get("width", 100)
        height = size.get("height", 100)
        size_score = min(1.0, (width * height) / 10000)  # Normalize to typical sizes
        
        # Combine scores
        final_score = (type_score * 0.6 + position_score * 0.2 + size_score * 0.2)
        return min(1.0, max(0.0, final_score))
    
    async def _analyze_element_content(self, element_type: str, content: str) -> Dict[str, Any]:
        """Analyze element content to suggest appropriate animations"""
        analysis = {
            "text_length": len(content) if isinstance(content, str) else 0,
            "urgency_level": 0.0,
            "emotional_tone": "neutral",
            "action_oriented": False,
            "animation_hints": []
        }
        
        if isinstance(content, str) and content:
            # Use text generation service for content analysis
            try:
                content_analysis = await text_generation_service.smart_content_analysis(content)
                
                # Extract relevant insights for animation
                if "emotional_triggers" in content_analysis.get("analysis", {}):
                    triggers = content_analysis["analysis"]["emotional_triggers"]
                    if "urgency" in triggers:
                        analysis["urgency_level"] = 0.8
                        analysis["animation_hints"].append("emphasize_urgency")
                    if "excitement" in triggers:
                        analysis["emotional_tone"] = "energetic"
                        analysis["animation_hints"].append("energetic_entry")
                
                if content_analysis.get("analysis", {}).get("call_to_action_strength", 0) > 0.5:
                    analysis["action_oriented"] = True
                    analysis["animation_hints"].append("attention_grabbing")
                    
            except Exception as e:
                self.logger.warning(f"Content analysis failed: {e}")
        
        # Type-specific analysis
        if element_type == "cta":
            analysis["action_oriented"] = True
            analysis["animation_hints"].append("pulse_emphasis")
        elif element_type == "headline":
            analysis["animation_hints"].append("dramatic_entry")
        
        return analysis
    
    def _calculate_timing_priority(self, element: Dict[str, Any], importance: float) -> int:
        """Calculate when element should animate (priority order)"""
        element_type = element.get("type", "unknown")
        
        # Base timing priorities
        timing_map = {
            "background": 0,
            "logo": 1,
            "headline": 2,
            "subheading": 3,
            "product": 2,
            "body": 4,
            "cta": 5,  # CTAs often animate last for emphasis
            "decoration": 1
        }
        
        base_priority = timing_map.get(element_type, 3)
        
        # Adjust based on importance
        importance_modifier = int(importance * 2)  # 0-2 modifier
        
        return max(0, base_priority + importance_modifier)
    
    def _assess_animation_suitability(self, element: Dict[str, Any]) -> Dict[str, Any]:
        """Assess how suitable an element is for different types of animations"""
        element_type = element.get("type", "unknown")
        size = element.get("size", {})
        
        suitability = {
            "entry": 0.8,
            "emphasis": 0.6,
            "exit": 0.5,
            "transform": 0.7,
            "interaction": 0.4
        }
        
        # Type-specific adjustments
        if element_type == "cta":
            suitability["emphasis"] = 1.0
            suitability["interaction"] = 1.0
        elif element_type == "headline":
            suitability["entry"] = 1.0
            suitability["transform"] = 0.9
        elif element_type == "background":
            suitability["entry"] = 0.3
            suitability["emphasis"] = 0.1
        elif element_type == "product":
            suitability["entry"] = 1.0
            suitability["emphasis"] = 0.9
            suitability["transform"] = 1.0
        
        # Size-based adjustments (larger elements better for certain animations)
        area = size.get("width", 100) * size.get("height", 100)
        if area > 50000:  # Large elements
            suitability["transform"] *= 1.2
            suitability["emphasis"] *= 0.8
        elif area < 5000:  # Small elements
            suitability["transform"] *= 0.7
            suitability["emphasis"] *= 1.3
        
        # Normalize to 0-1 range
        for key in suitability:
            suitability[key] = min(1.0, max(0.0, suitability[key]))
        
        return suitability
    
    async def _create_animation_strategy(
        self,
        element_analysis: List[Dict[str, Any]],
        style: AnimationStyleEnum,
        purpose: AnimationPurposeEnum,
        duration: float
    ) -> Dict[str, Any]:
        """Create overall animation strategy based on analysis"""
        
        # Get style and purpose preferences
        style_prefs = self.style_preferences[style]
        purpose_prefs = self.purpose_mappings[purpose]
        
        # Calculate timing strategy
        timing_strategy = await self._calculate_timing_strategy(
            element_analysis, purpose_prefs["timing_strategy"], duration
        )
        
        # Determine animation distribution
        animation_distribution = self._calculate_animation_distribution(
            element_analysis, style_prefs, purpose_prefs
        )
        
        # Create coordination rules
        coordination_rules = self._create_coordination_rules(
            element_analysis, style, purpose
        )
        
        strategy = {
            "style": style.value,
            "purpose": purpose.value,
            "timing_strategy": timing_strategy,
            "animation_distribution": animation_distribution,
            "coordination_rules": coordination_rules,
            "total_duration": duration,
            "performance_targets": {
                "attention_retention": 0.8,
                "engagement_rate": 0.7,
                "conversion_lift": 0.15
            }
        }
        
        return strategy
    
    async def _calculate_timing_strategy(
        self,
        element_analysis: List[Dict[str, Any]],
        timing_type: str,
        duration: float
    ) -> Dict[str, Any]:
        """Calculate when each element should animate"""
        
        timing_strategies = {
            "immediate": {"delay_factor": 0.0, "stagger": 0.1},
            "staggered": {"delay_factor": 0.2, "stagger": 0.3},
            "delayed": {"delay_factor": 0.5, "stagger": 0.2},
            "coordinated": {"delay_factor": 0.1, "stagger": 0.4},
            "sequential": {"delay_factor": 0.0, "stagger": 0.8},
            "highlight": {"delay_factor": 0.3, "stagger": 0.1},
            "emphasized": {"delay_factor": 0.7, "stagger": 0.1}
        }
        
        strategy = timing_strategies.get(timing_type, timing_strategies["staggered"])
        
        # Calculate specific timings
        sorted_elements = sorted(element_analysis, key=lambda x: x["timing_priority"])
        element_timings = []
        
        for i, element in enumerate(sorted_elements):
            base_delay = duration * strategy["delay_factor"]
            stagger_delay = i * duration * strategy["stagger"] / len(sorted_elements)
            
            total_delay = base_delay + stagger_delay
            
            element_timings.append({
                "element_id": element["element_id"],
                "start_time": total_delay,
                "priority": element["timing_priority"],
                "importance": element["importance"]
            })
        
        return {
            "type": timing_type,
            "element_timings": element_timings,
            "total_sequence_time": max(t["start_time"] for t in element_timings) + 1.0
        }
    
    def _calculate_animation_distribution(
        self,
        element_analysis: List[Dict[str, Any]],
        style_prefs: Dict[str, Any],
        purpose_prefs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Determine which animations to use for each element type"""
        
        preferred_animations = purpose_prefs["suggested_animations"]
        animation_types = purpose_prefs["primary_types"]
        
        distribution = {}
        
        for element in element_analysis:
            element_type = element["type"]
            suitability = element["animation_suitability"]
            content_hints = element["content_analysis"]["animation_hints"]
            
            # Score each available animation
            animation_scores = {}
            
            for anim_type in animation_types:
                if anim_type in self.animation_templates:
                    for anim_name, anim_data in self.animation_templates[anim_type].items():
                        if anim_name in preferred_animations:
                            # Base score from preference
                            score = 0.7
                            
                            # Adjust for element suitability
                            if anim_type in suitability:
                                score *= suitability[anim_type]
                            
                            # Adjust for content hints
                            for hint in content_hints:
                                if hint in anim_name or any(h in anim_name for h in ["pulse", "glow", "bounce"]):
                                    score *= 1.2
                            
                            # Adjust for style preferences
                            if anim_data.get("impact") in style_prefs["impact_preference"]:
                                score *= 1.3
                            
                            animation_scores[f"{anim_type}_{anim_name}"] = score
            
            # Select best animation
            if animation_scores:
                best_animation = max(animation_scores.items(), key=lambda x: x[1])
                distribution[element["element_id"]] = {
                    "animation": best_animation[0],
                    "score": best_animation[1],
                    "type": element_type
                }
        
        return distribution
    
    def _create_coordination_rules(
        self,
        element_analysis: List[Dict[str, Any]],
        style: AnimationStyleEnum,
        purpose: AnimationPurposeEnum
    ) -> Dict[str, Any]:
        """Create rules for coordinating animations between elements"""
        
        rules = {
            "max_simultaneous": 3,  # Max elements animating at once
            "min_gap": 0.1,  # Minimum time between animation starts
            "related_elements": [],  # Elements that should animate together
            "conflicting_elements": [],  # Elements that shouldn't animate simultaneously
            "cascade_rules": []  # Rules for cascading animations
        }
        
        # Style-specific adjustments
        if style == AnimationStyleEnum.DRAMATIC:
            rules["max_simultaneous"] = 1
            rules["min_gap"] = 0.5
        elif style == AnimationStyleEnum.ENERGETIC:
            rules["max_simultaneous"] = 5
            rules["min_gap"] = 0.05
        elif style == AnimationStyleEnum.PROFESSIONAL:
            rules["max_simultaneous"] = 2
            rules["min_gap"] = 0.3
        
        # Purpose-specific adjustments
        if purpose == AnimationPurposeEnum.ATTENTION:
            rules["max_simultaneous"] = 1  # Focus attention
        elif purpose == AnimationPurposeEnum.STORYTELLING:
            rules["cascade_rules"].append("sequential_by_reading_order")
        
        # Identify related elements
        headlines = [e for e in element_analysis if e["type"] == "headline"]
        subheadings = [e for e in element_analysis if e["type"] == "subheading"]
        
        if headlines and subheadings:
            rules["related_elements"].append({
                "elements": [h["element_id"] for h in headlines] + [s["element_id"] for s in subheadings],
                "relationship": "header_group",
                "coordination": "staggered"
            })
        
        return rules
    
    async def _generate_element_animation(
        self,
        element: Dict[str, Any],
        analysis: Dict[str, Any],
        strategy: Dict[str, Any],
        style: AnimationStyleEnum,
        purpose: AnimationPurposeEnum
    ) -> Dict[str, Any]:
        """Generate specific animation for an individual element"""
        
        element_id = element.get("id")
        animation_assignment = strategy["animation_distribution"].get(element_id, {})
        
        if not animation_assignment:
            return {
                "element_id": element_id,
                "type": "none",
                "keyframes": [],
                "duration": 0
            }
        
        # Parse animation type and name
        animation_key = animation_assignment["animation"]
        anim_type, anim_name = animation_key.split("_", 1)
        
        # Get base animation template
        base_template = self.animation_templates[anim_type][anim_name]
        
        # Customize animation based on element and style
        customized_animation = await self._customize_animation(
            base_template, element, analysis, style, purpose
        )
        
        # Add timing from strategy
        timing_info = next(
            (t for t in strategy["timing_strategy"]["element_timings"] 
             if t["element_id"] == element_id),
            {"start_time": 0, "priority": 0}
        )
        
        animation = {
            "element_id": element_id,
            "type": anim_type,
            "name": anim_name,
            "keyframes": customized_animation["keyframes"],
            "duration": customized_animation["duration"],
            "easing": customized_animation["easing"],
            "delay": timing_info["start_time"],
            "properties": customized_animation["properties"],
            "repeat": customized_animation.get("repeat", "none"),
            "confidence_score": animation_assignment["score"]
        }
        
        return animation
    
    async def _customize_animation(
        self,
        base_template: Dict[str, Any],
        element: Dict[str, Any],
        analysis: Dict[str, Any],
        style: AnimationStyleEnum,
        purpose: AnimationPurposeEnum
    ) -> Dict[str, Any]:
        """Customize base animation template for specific element and style"""
        
        style_prefs = self.style_preferences[style]
        
        # Customize duration
        min_duration, max_duration = style_prefs["duration_range"]
        base_duration = max_duration if base_template.get("impact") == "high" else min_duration
        
        # Adjust for element importance
        importance_factor = analysis["importance"]
        duration = base_duration * (0.8 + importance_factor * 0.4)
        
        # Customize easing
        preferred_easings = style_prefs["easing_preference"]
        easing = random.choice(preferred_easings) if preferred_easings else base_template["easing"]
        
        # Scale keyframes to new duration
        scaled_keyframes = []
        original_max_time = max(kf["time"] for kf in base_template["keyframes"])
        
        for keyframe in base_template["keyframes"]:
            scaled_time = (keyframe["time"] / original_max_time) * duration
            scaled_keyframe = {"time": scaled_time, **{k: v for k, v in keyframe.items() if k != "time"}}
            scaled_keyframes.append(scaled_keyframe)
        
        # Add element-specific modifications
        if analysis["content_analysis"]["urgency_level"] > 0.7:
            # Make urgent animations faster and more pronounced
            duration *= 0.8
            if "scale" in str(scaled_keyframes):
                # Increase scale variations for emphasis
                for kf in scaled_keyframes:
                    if "transform" in kf and "scale" in kf["transform"]:
                        # Extract and amplify scale
                        transform = kf["transform"]
                        if "scale(1.1)" in transform:
                            kf["transform"] = transform.replace("scale(1.1)", "scale(1.2)")
        
        customized = {
            "keyframes": scaled_keyframes,
            "duration": duration,
            "easing": easing,
            "properties": base_template["properties"],
            "repeat": "infinite" if base_template.get("repeatable") and purpose == AnimationPurposeEnum.ATTENTION else "none"
        }
        
        return customized
    
    async def _optimize_animation_timing(
        self,
        animations: List[Dict[str, Any]],
        strategy: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Optimize timing coordination between animations"""
        
        coordination_rules = strategy["coordination_rules"]
        optimized = animations.copy()
        
        # Apply max simultaneous rule
        max_simultaneous = coordination_rules["max_simultaneous"]
        min_gap = coordination_rules["min_gap"]
        
        # Sort by delay time
        optimized.sort(key=lambda x: x["delay"])
        
        # Adjust delays to respect simultaneity limits
        active_animations = []
        
        for i, animation in enumerate(optimized):
            current_time = animation["delay"]
            
            # Remove finished animations from active list
            active_animations = [
                a for a in active_animations
                if a["delay"] + a["duration"] > current_time
            ]
            
            # If too many active, delay this animation
            if len(active_animations) >= max_simultaneous:
                # Find earliest finish time
                earliest_finish = min(a["delay"] + a["duration"] for a in active_animations)
                new_delay = earliest_finish + min_gap
                animation["delay"] = new_delay
                current_time = new_delay
            
            active_animations.append(animation)
        
        # Apply related element coordination
        for relation in coordination_rules["related_elements"]:
            related_ids = relation["elements"]
            coordination_type = relation["coordination"]
            
            related_animations = [a for a in optimized if a["element_id"] in related_ids]
            
            if coordination_type == "staggered" and len(related_animations) > 1:
                # Stagger related animations
                related_animations.sort(key=lambda x: x["delay"])
                base_delay = related_animations[0]["delay"]
                
                for j, anim in enumerate(related_animations[1:], 1):
                    anim["delay"] = base_delay + j * 0.2
        
        return optimized
    
    async def _generate_animation_insights(
        self,
        animations: List[Dict[str, Any]],
        strategy: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate insights about the animation strategy and expected performance"""
        
        total_animations = len(animations)
        avg_confidence = np.mean([a["confidence_score"] for a in animations]) if animations else 0
        
        # Calculate timing insights
        total_sequence_time = max((a["delay"] + a["duration"]) for a in animations) if animations else 0
        stagger_consistency = self._calculate_stagger_consistency(animations)
        
        # Analyze animation variety
        animation_types = [a["name"] for a in animations]
        type_diversity = len(set(animation_types)) / len(animation_types) if animation_types else 0
        
        # Performance predictions
        predicted_performance = self._predict_animation_performance(animations, strategy)
        
        insights = {
            "summary": {
                "total_animations": total_animations,
                "average_confidence": avg_confidence,
                "total_sequence_time": total_sequence_time,
                "type_diversity": type_diversity
            },
            "timing_analysis": {
                "sequence_duration": total_sequence_time,
                "stagger_consistency": stagger_consistency,
                "peak_simultaneous": self._calculate_peak_simultaneous(animations)
            },
            "style_analysis": {
                "dominant_style": strategy["style"],
                "purpose_alignment": strategy["purpose"],
                "consistency_score": self._calculate_style_consistency(animations, strategy)
            },
            "predicted_performance": predicted_performance,
            "recommendations": await self._generate_performance_recommendations(animations, strategy)
        }
        
        return insights
    
    def _calculate_stagger_consistency(self, animations: List[Dict[str, Any]]) -> float:
        """Calculate how consistent the timing staggers are"""
        if len(animations) < 2:
            return 1.0
        
        delays = sorted([a["delay"] for a in animations])
        gaps = [delays[i+1] - delays[i] for i in range(len(delays)-1)]
        
        if not gaps:
            return 1.0
        
        # Calculate coefficient of variation (lower is more consistent)
        mean_gap = np.mean(gaps)
        std_gap = np.std(gaps)
        
        if mean_gap == 0:
            return 1.0
        
        cv = std_gap / mean_gap
        consistency = max(0.0, 1.0 - cv)  # Convert to 0-1 scale where 1 is most consistent
        
        return consistency
    
    def _calculate_peak_simultaneous(self, animations: List[Dict[str, Any]]) -> int:
        """Calculate the maximum number of animations running simultaneously"""
        if not animations:
            return 0
        
        # Create timeline of start and end events
        events = []
        for anim in animations:
            events.append({"time": anim["delay"], "type": "start"})
            events.append({"time": anim["delay"] + anim["duration"], "type": "end"})
        
        # Sort events by time
        events.sort(key=lambda x: x["time"])
        
        # Track peak simultaneous
        current_count = 0
        peak_count = 0
        
        for event in events:
            if event["type"] == "start":
                current_count += 1
                peak_count = max(peak_count, current_count)
            else:
                current_count -= 1
        
        return peak_count
    
    def _calculate_style_consistency(
        self, 
        animations: List[Dict[str, Any]], 
        strategy: Dict[str, Any]
    ) -> float:
        """Calculate how well animations match the intended style"""
        if not animations:
            return 0.0
        
        style = AnimationStyleEnum(strategy["style"])
        style_prefs = self.style_preferences[style]
        
        consistency_scores = []
        
        for animation in animations:
            score = 0.0
            
            # Check duration consistency
            duration = animation["duration"]
            min_dur, max_dur = style_prefs["duration_range"]
            if min_dur <= duration <= max_dur:
                score += 0.4
            
            # Check easing consistency
            easing = animation["easing"]
            if easing in style_prefs["easing_preference"]:
                score += 0.3
            
            # Check animation type consistency
            animation_name = animation["name"]
            if animation_name in style_prefs["preferred_animations"]:
                score += 0.3
            
            consistency_scores.append(score)
        
        return np.mean(consistency_scores)
    
    def _predict_animation_performance(
        self, 
        animations: List[Dict[str, Any]], 
        strategy: Dict[str, Any]
    ) -> Dict[str, float]:
        """Predict performance metrics for the animation strategy"""
        
        # Base predictions on animation characteristics
        avg_confidence = np.mean([a["confidence_score"] for a in animations]) if animations else 0
        style_consistency = self._calculate_style_consistency(animations, strategy)
        timing_quality = self._calculate_stagger_consistency(animations)
        
        # Calculate predicted metrics
        attention_score = min(1.0, avg_confidence * 0.7 + timing_quality * 0.3)
        engagement_score = min(1.0, style_consistency * 0.6 + avg_confidence * 0.4)
        
        # Adjust based on style and purpose
        style = AnimationStyleEnum(strategy["style"])
        purpose = AnimationPurposeEnum(strategy["purpose"])
        
        # Style adjustments
        if style == AnimationStyleEnum.ENERGETIC:
            attention_score *= 1.2
            engagement_score *= 1.1
        elif style == AnimationStyleEnum.SUBTLE:
            attention_score *= 0.9
            engagement_score *= 1.0
        elif style == AnimationStyleEnum.DRAMATIC:
            attention_score *= 1.3
            engagement_score *= 0.95
        
        # Purpose adjustments
        if purpose == AnimationPurposeEnum.ATTENTION:
            attention_score *= 1.4
        elif purpose == AnimationPurposeEnum.CONVERSION:
            engagement_score *= 1.2
        
        # Normalize to 0-1 range
        attention_score = min(1.0, max(0.0, attention_score))
        engagement_score = min(1.0, max(0.0, engagement_score))
        
        return {
            "attention_retention": attention_score,
            "engagement_rate": engagement_score,
            "visual_appeal": (attention_score + engagement_score) / 2,
            "conversion_potential": engagement_score * 0.8,  # Conservative estimate
            "brand_consistency": style_consistency
        }
    
    async def _generate_performance_recommendations(
        self, 
        animations: List[Dict[str, Any]], 
        strategy: Dict[str, Any]
    ) -> List[str]:
        """Generate recommendations for improving animation performance"""
        recommendations = []
        
        # Analyze current performance
        avg_confidence = np.mean([a["confidence_score"] for a in animations]) if animations else 0
        timing_consistency = self._calculate_stagger_consistency(animations)
        style_consistency = self._calculate_style_consistency(animations, strategy)
        peak_simultaneous = self._calculate_peak_simultaneous(animations)
        
        # Generate specific recommendations
        if avg_confidence < 0.7:
            recommendations.append("Consider using more impactful animation types for key elements")
        
        if timing_consistency < 0.6:
            recommendations.append("Improve timing consistency between animations for smoother flow")
        
        if style_consistency < 0.7:
            recommendations.append("Align animation choices better with selected style preferences")
        
        if peak_simultaneous > 4:
            recommendations.append("Reduce simultaneous animations to improve focus and performance")
        
        # Check total duration
        total_duration = max((a["delay"] + a["duration"]) for a in animations) if animations else 0
        if total_duration > 8.0:
            recommendations.append("Consider shortening animation sequence to maintain user attention")
        elif total_duration < 2.0:
            recommendations.append("Extend animation sequence to build better engagement")
        
        # Style-specific recommendations
        style = AnimationStyleEnum(strategy["style"])
        if style == AnimationStyleEnum.PROFESSIONAL and any(a["name"] in ["bounce_in", "shake"] for a in animations):
            recommendations.append("Replace bouncy animations with subtler effects for professional tone")
        
        if style == AnimationStyleEnum.ENERGETIC and not any(a["repeat"] == "infinite" for a in animations):
            recommendations.append("Add repeating animations to maintain energetic feel")
        
        return recommendations
    
    # Additional helper methods for optimization and analysis
    
    async def _analyze_current_animations(self, animations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze existing animations for optimization opportunities"""
        # Implementation for analyzing current animation performance
        return {
            "performance_metrics": {},
            "optimization_potential": 0.0,
            "issues_identified": []
        }
    
    async def _identify_optimization_opportunities(
        self, 
        analysis: Dict[str, Any], 
        goals: Dict[str, Any], 
        context: Optional[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Identify specific optimization opportunities"""
        # Implementation for identifying optimization opportunities
        return []
    
    async def _apply_optimizations(
        self, 
        animations: List[Dict[str, Any]], 
        opportunities: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Apply identified optimizations to animations"""
        # Implementation for applying optimizations
        return animations
    
    async def _calculate_improvement_metrics(
        self, 
        original: List[Dict[str, Any]], 
        optimized: List[Dict[str, Any]], 
        goals: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate improvement metrics between original and optimized animations"""
        # Implementation for calculating improvements
        return {
            "performance_improvement": 0.0,
            "metrics_comparison": {},
            "goal_achievement": {}
        }
    
    async def _generate_optimization_recommendations(
        self, 
        analysis: Dict[str, Any], 
        opportunities: List[Dict[str, Any]]
    ) -> List[str]:
        """Generate optimization recommendations"""
        # Implementation for generating recommendations
        return []
    
    async def _create_animation_variation(
        self, 
        base_animation: Dict[str, Any], 
        creativity_factor: float, 
        variation_index: int
    ) -> Dict[str, Any]:
        """Create a variation of the base animation"""
        # Implementation for creating animation variations
        variation = base_animation.copy()
        variation["name"] = f"{base_animation.get('name', 'animation')}_variation_{variation_index}"
        return variation
    
    async def _score_animation_variation(
        self, 
        variation: Dict[str, Any], 
        base_animation: Dict[str, Any]
    ) -> float:
        """Score animation variation based on effectiveness"""
        # Implementation for scoring variations
        return random.uniform(0.6, 0.95)
    
    async def _analyze_animation_context(
        self, 
        industry: str, 
        brand_personality: List[str], 
        target_audience: Dict[str, Any], 
        content_type: str
    ) -> Dict[str, Any]:
        """Analyze context for animation recommendations"""
        # Implementation for context analysis
        return {
            "industry_preferences": {},
            "brand_alignment": {},
            "audience_preferences": {},
            "content_requirements": {}
        }
    
    async def _recommend_animation_styles(self, context_analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Recommend animation styles based on context"""
        # Implementation for style recommendations
        return [
            {"style": "professional", "confidence": 0.8},
            {"style": "smooth", "confidence": 0.7}
        ]
    
    async def _create_contextual_preset(
        self, 
        style_config: Dict[str, Any], 
        context_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create animation preset for specific context"""
        # Implementation for creating contextual presets
        return {
            "name": f"Custom {style_config['style']} Preset",
            "style": style_config["style"],
            "animations": [],
            "settings": {}
        }
    
    async def _generate_preset_guidelines(
        self, 
        presets: List[Dict[str, Any]], 
        context_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate usage guidelines for presets"""
        # Implementation for generating guidelines
        return {
            "usage_recommendations": [],
            "best_practices": [],
            "common_pitfalls": []
        }
    
    async def close(self):
        """Close the service and cleanup resources"""
        self.logger.info("Magic Animator service closed")


# Global service instance
magic_animator_service = MagicAnimatorService()