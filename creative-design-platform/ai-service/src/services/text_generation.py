"""
Advanced AI Text Generation Service using OpenAI GPT-4
Phase 3: Enhanced with smart content analysis, A/B testing, and contextual optimization
"""
import asyncio
import httpx
import time
import re
import random
from typing import List, Dict, Any, Optional, Tuple
import json
import numpy as np
from collections import Counter

from .base import BaseAIService, job_tracker
from ..models.schemas import (
    TextGenerationRequest,
    TextGenerationResponse,
    GeneratedText,
    TextToneEnum,
    TranslationRequest,
    TranslationResponse
)
from ..config import settings


class TextGenerationService(BaseAIService):
    """Advanced AI-powered text generation service with Phase 3 enhancements"""
    
    def __init__(self):
        super().__init__()
        self.openai_client: Optional[httpx.AsyncClient] = None
        self.deepl_client: Optional[httpx.AsyncClient] = None
        
        # Enhanced tone-specific prompts with psychological triggers
        self.tone_prompts = {
            TextToneEnum.FRIENDLY: "Write in a warm, approachable, and friendly tone that builds trust and rapport",
            TextToneEnum.FORMAL: "Write in a professional, formal, and business-appropriate tone that commands respect",
            TextToneEnum.CASUAL: "Write in a relaxed, conversational, and casual tone that feels personal and relatable",
            TextToneEnum.PROFESSIONAL: "Write in a confident, expert, and professional tone that demonstrates authority",
            TextToneEnum.OPTIMISTIC: "Write with enthusiasm, positivity, and optimism that inspires hope and action",
            TextToneEnum.CONFIDENT: "Write with authority, certainty, and confidence that builds credibility",
            TextToneEnum.ASSERTIVE: "Write with directness, clarity, and assertiveness that drives immediate action",
            TextToneEnum.EMOTIONAL: "Write with emotional resonance and personal connection that creates empathy",
            TextToneEnum.SERIOUS: "Write with gravity, importance, and seriousness that conveys urgency",
            TextToneEnum.HUMOROUS: "Write with wit, humor, and lightheartedness that entertains and engages"
        }
        
        # Enhanced format-specific instructions with conversion optimization
        self.format_instructions = {
            "headline": "Create a compelling headline that grabs attention and drives clicks (5-10 words, use power words)",
            "subheading": "Write a descriptive subheading that supports the main message and builds curiosity (10-15 words)",
            "body": "Write clear, engaging body text that informs, persuades, and addresses pain points",
            "cta": "Create a strong call-to-action that motivates immediate response using action verbs (2-5 words)",
            "tagline": "Write a memorable tagline that captures brand essence and sticks in memory (3-8 words)",
            "social": "Write engaging social media copy that encourages interaction and sharing",
            "email_subject": "Create an email subject line that increases open rates (30-50 characters)",
            "ad_copy": "Write persuasive ad copy that drives conversions with clear benefits and urgency"
        }
        
        # Power words for enhanced conversions
        self.power_words = {
            "urgency": ["now", "today", "instant", "immediately", "limited", "exclusive", "urgent", "deadline"],
            "value": ["free", "save", "discount", "bonus", "extra", "valuable", "premium", "guaranteed"],
            "emotion": ["amazing", "incredible", "stunning", "revolutionary", "breakthrough", "life-changing"],
            "trust": ["proven", "trusted", "verified", "certified", "authentic", "genuine", "reliable"],
            "curiosity": ["secret", "hidden", "revealed", "discover", "unlock", "expose", "insider"]
        }
        
        # Industry-specific terminology and best practices
        self.industry_contexts = {
            "ecommerce": {
                "keywords": ["buy", "shop", "order", "purchase", "cart", "checkout", "deals", "offers"],
                "pain_points": ["price", "quality", "shipping", "returns", "trust", "reviews"],
                "benefits": ["convenience", "savings", "selection", "quality", "fast delivery"]
            },
            "saas": {
                "keywords": ["solution", "platform", "tool", "software", "dashboard", "integration", "automation"],
                "pain_points": ["efficiency", "productivity", "scalability", "costs", "complexity"],
                "benefits": ["streamline", "optimize", "scale", "reduce costs", "simplify"]
            },
            "healthcare": {
                "keywords": ["health", "wellness", "treatment", "care", "medicine", "therapy", "prevention"],
                "pain_points": ["pain", "symptoms", "condition", "health concerns", "treatment options"],
                "benefits": ["healing", "relief", "improvement", "prevention", "quality of life"]
            },
            "finance": {
                "keywords": ["investment", "savings", "loan", "credit", "financial", "money", "wealth"],
                "pain_points": ["debt", "expenses", "financial stress", "planning", "security"],
                "benefits": ["financial freedom", "security", "growth", "stability", "peace of mind"]
            }
        }
        
        # A/B testing frameworks
        self.ab_test_variations = {
            "emotional_vs_rational": ["emotional appeal", "logical reasoning"],
            "benefit_vs_feature": ["benefit-focused", "feature-focused"],
            "urgency_vs_value": ["urgency-driven", "value-proposition"],
            "question_vs_statement": ["question format", "statement format"],
            "long_vs_short": ["detailed copy", "concise copy"]
        }
    
    async def _setup(self) -> None:
        """Initialize the text generation service"""
        if not settings.openai_api_key:
            raise ValueError("OPENAI_API_KEY is required for text generation")
        
        # Setup OpenAI client
        self.openai_client = httpx.AsyncClient(
            base_url="https://api.openai.com/v1",
            headers={
                "Authorization": f"Bearer {settings.openai_api_key}",
                "Content-Type": "application/json"
            },
            timeout=httpx.Timeout(120.0)
        )
        
        # Setup DeepL client if API key is available
        if settings.deepl_api_key:
            self.deepl_client = httpx.AsyncClient(
                base_url="https://api-free.deepl.com/v2",  # Use api.deepl.com for pro
                headers={
                    "Authorization": f"DeepL-Auth-Key {settings.deepl_api_key}",
                    "Content-Type": "application/json"
                },
                timeout=httpx.Timeout(60.0)
            )
        
        await self.health_check()
    
    async def health_check(self) -> bool:
        """Check if the text generation service is healthy"""
        try:
            if not self.openai_client:
                return False
            
            # Test OpenAI API with a minimal request
            response = await self.openai_client.get("/models")
            return response.status_code == 200
        except Exception as e:
            self.logger.error("Health check failed", error=str(e))
            return False
    
    async def generate_text(self, request: TextGenerationRequest) -> TextGenerationResponse:
        """Generate AI text using GPT-4"""
        job_id = self.generate_job_id()
        start_time = time.time()
        
        try:
            # Create job tracking
            job_tracker.create_job(
                job_id=job_id,
                operation="text_generation",
                context=request.context,
                tone=request.tone.value,
                format_type=request.format_type,
                variation_count=request.variation_count
            )
            
            await self._log_job_start(
                job_id, "text_generation",
                context=request.context,
                tone=request.tone.value,
                format_type=request.format_type
            )
            
            job_tracker.set_job_processing(job_id, 10.0)
            
            # Build the prompt
            system_prompt = self._build_system_prompt(request)
            user_prompt = self._build_user_prompt(request)
            
            job_tracker.set_job_processing(job_id, 25.0)
            
            # Generate variations
            variations = []
            for i in range(request.variation_count):
                variation_text = await self._generate_single_text(
                    system_prompt, user_prompt, i
                )
                
                # Calculate confidence score (simplified)
                confidence = self._calculate_confidence_score(variation_text, request)
                
                variations.append(GeneratedText(
                    text=variation_text,
                    confidence_score=confidence
                ))
                
                # Update progress
                progress = 25.0 + (i + 1) / request.variation_count * 65.0
                job_tracker.set_job_processing(job_id, progress)
            
            # Sort by confidence score
            variations.sort(key=lambda x: x.confidence_score, reverse=True)
            
            # Create response
            response_data = TextGenerationResponse(
                variations=variations,
                context=request.context,
                tone=request.tone,
                job_id=job_id
            )
            
            job_tracker.set_job_completed(job_id, variations[0].text if variations else "")
            
            duration = time.time() - start_time
            await self._log_job_complete(
                job_id, "text_generation", duration,
                variation_count=len(variations)
            )
            
            return response_data
            
        except Exception as e:
            job_tracker.set_job_failed(job_id, str(e))
            await self._log_job_error(job_id, "text_generation", e)
            raise
    
    def _build_system_prompt(self, request: TextGenerationRequest) -> str:
        """Build system prompt for GPT-4"""
        tone_instruction = self.tone_prompts.get(request.tone, "")
        format_instruction = self.format_instructions.get(request.format_type, "")
        
        system_prompt = f"""You are an expert copywriter and marketing professional. Your task is to create compelling advertising copy.

Context Guidelines:
- {tone_instruction}
- {format_instruction}
- Maximum length: {request.max_length} characters
- Target audience: {request.target_audience or 'General audience'}

Quality Requirements:
- Clear and concise messaging
- Action-oriented language
- Engaging and memorable
- Appropriate for advertising use
- No controversial or inappropriate content

Return only the text content without quotes, explanations, or additional formatting."""
        
        return system_prompt
    
    def _build_user_prompt(self, request: TextGenerationRequest) -> str:
        """Build user prompt for text generation"""
        user_prompt = f"""Create {request.format_type} copy for the following:

Context: {request.context}

Requirements:
- Tone: {request.tone.value}
- Format: {request.format_type}
- Maximum length: {request.max_length} characters"""
        
        if request.target_audience:
            user_prompt += f"\n- Target audience: {request.target_audience}"
        
        user_prompt += f"\n\nGenerate compelling {request.format_type} copy:"
        
        return user_prompt
    
    async def _generate_single_text(self, system_prompt: str, user_prompt: str, variation_index: int) -> str:
        """Generate a single text variation"""
        # Add variation to prompt for diversity
        if variation_index > 0:
            user_prompt += f"\n\n(Variation {variation_index + 1}: Provide a different approach/angle)"
        
        request_data = {
            "model": "gpt-4",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "max_tokens": 150,
            "temperature": 0.8 + (variation_index * 0.1),  # Increase creativity for variations
            "top_p": 0.9,
            "frequency_penalty": 0.3,
            "presence_penalty": 0.3
        }
        
        response = await self.openai_client.post("/chat/completions", json=request_data)
        
        if response.status_code != 200:
            error_data = response.json()
            error_msg = error_data.get("error", {}).get("message", "API error")
            raise Exception(f"OpenAI API error: {error_msg}")
        
        response_data = response.json()
        generated_text = response_data["choices"][0]["message"]["content"].strip()
        
        return generated_text
    
    def _calculate_confidence_score(self, text: str, request: TextGenerationRequest) -> float:
        """Calculate confidence score for generated text (simplified)"""
        score = 0.8  # Base score
        
        # Length appropriateness
        if len(text) <= request.max_length:
            score += 0.1
        else:
            score -= 0.2
        
        # Format appropriateness
        if request.format_type == "headline" and len(text.split()) <= 10:
            score += 0.05
        elif request.format_type == "cta" and len(text.split()) <= 5:
            score += 0.05
        elif request.format_type == "tagline" and len(text.split()) <= 8:
            score += 0.05
        
        # Ensure score is between 0 and 1
        return max(0.0, min(1.0, score))
    
    async def translate_text(self, request: TranslationRequest) -> TranslationResponse:
        """Translate text using DeepL API"""
        job_id = self.generate_job_id()
        start_time = time.time()
        
        try:
            if not self.deepl_client:
                raise ValueError("DeepL API not configured")
            
            # Create job tracking
            job_tracker.create_job(
                job_id=job_id,
                operation="translation",
                source_language=request.source_language,
                target_language=request.target_language,
                text_length=len(request.text)
            )
            
            await self._log_job_start(
                job_id, "translation",
                source_language=request.source_language,
                target_language=request.target_language
            )
            
            job_tracker.set_job_processing(job_id, 25.0)
            
            # Prepare DeepL request
            request_data = {
                "text": [request.text],
                "target_lang": request.target_language.upper(),
                "preserve_formatting": request.preserve_formatting
            }
            
            if request.source_language != "auto":
                request_data["source_lang"] = request.source_language.upper()
            
            job_tracker.set_job_processing(job_id, 50.0)
            
            # Make API request
            response = await self.deepl_client.post("/translate", json=request_data)
            
            if response.status_code != 200:
                error_data = response.json()
                error_msg = error_data.get("message", "Translation failed")
                raise Exception(f"DeepL API error: {error_msg}")
            
            response_data = response.json()
            translations = response_data["translations"]
            
            if not translations:
                raise Exception("No translation returned")
            
            translation = translations[0]
            
            job_tracker.set_job_processing(job_id, 90.0)
            
            # Create response
            response_data = TranslationResponse(
                translated_text=translation["text"],
                source_language=translation.get("detected_source_language", request.source_language),
                target_language=request.target_language,
                confidence_score=0.95,  # DeepL generally high quality
                job_id=job_id
            )
            
            job_tracker.set_job_completed(job_id, translation["text"])
            
            duration = time.time() - start_time
            await self._log_job_complete(job_id, "translation", duration)
            
            return response_data
            
        except Exception as e:
            job_tracker.set_job_failed(job_id, str(e))
            await self._log_job_error(job_id, "translation", e)
            raise
    
    async def generate_bulk_text(
        self, 
        contexts: List[str], 
        tone: TextToneEnum,
        format_type: str = "body"
    ) -> List[TextGenerationResponse]:
        """Generate text for multiple contexts in batch"""
        tasks = []
        
        for context in contexts:
            request = TextGenerationRequest(
                context=context,
                tone=tone,
                format_type=format_type,
                variation_count=3
            )
            tasks.append(self.generate_text(request))
        
        # Execute all requests concurrently
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter out exceptions and return successful results
        successful_results = [
            result for result in results 
            if not isinstance(result, Exception)
        ]
        
        return successful_results
    
    async def optimize_for_platform(
        self, 
        text: str, 
        platform: str, 
        format_type: str
    ) -> str:
        """Optimize text for specific advertising platforms"""
        platform_specs = {
            "facebook": {
                "headline": 40,
                "body": 125,
                "cta": 20
            },
            "google": {
                "headline": 30,
                "body": 90,
                "cta": 15
            },
            "instagram": {
                "headline": 35,
                "body": 150,
                "cta": 20
            },
            "linkedin": {
                "headline": 50,
                "body": 200,
                "cta": 25
            }
        }
        
        specs = platform_specs.get(platform.lower(), {})
        max_length = specs.get(format_type, len(text))
        
        if len(text) <= max_length:
            return text
        
        # Use GPT-4 to optimize length
        request = TextGenerationRequest(
            context=f"Optimize this {format_type} for {platform}: {text}",
            tone=TextToneEnum.PROFESSIONAL,
            format_type=format_type,
            max_length=max_length,
            variation_count=1
        )
        
        response = await self.generate_text(request)
        return response.variations[0].text if response.variations else text
    
    async def generate_ab_test_variations(
        self,
        context: str,
        format_type: str,
        tone: TextToneEnum,
        test_type: str = "emotional_vs_rational",
        variations_per_approach: int = 2
    ) -> Dict[str, List[GeneratedText]]:
        """Generate A/B test variations using different psychological approaches"""
        job_id = self.generate_job_id()
        
        try:
            job_tracker.create_job(
                job_id=job_id,
                operation="ab_test_generation",
                context=context,
                test_type=test_type,
                total_variations=len(self.ab_test_variations[test_type]) * variations_per_approach
            )
            
            approaches = self.ab_test_variations.get(test_type, ["default", "alternative"])
            results = {}
            
            for i, approach in enumerate(approaches):
                # Create specialized prompts for each approach
                specialized_request = self._create_specialized_request(
                    context, format_type, tone, approach
                )
                
                # Generate multiple variations for this approach
                approach_variations = []
                for j in range(variations_per_approach):
                    variation = await self._generate_single_text(
                        self._build_system_prompt(specialized_request),
                        self._build_user_prompt(specialized_request),
                        j
                    )
                    
                    # Enhanced confidence scoring for A/B testing
                    confidence = self._calculate_ab_confidence_score(
                        variation, specialized_request, approach
                    )
                    
                    approach_variations.append(GeneratedText(
                        text=variation,
                        confidence_score=confidence
                    ))
                
                results[approach] = approach_variations
                
                # Update progress
                progress = ((i + 1) / len(approaches)) * 90.0
                job_tracker.set_job_processing(job_id, progress)
            
            job_tracker.set_job_completed(job_id, f"Generated {test_type} A/B variations")
            
            return {
                "variations": results,
                "test_type": test_type,
                "recommended_winner": self._predict_winning_variation(results),
                "job_id": job_id
            }
            
        except Exception as e:
            job_tracker.set_job_failed(job_id, str(e))
            raise
    
    async def smart_content_analysis(self, text: str) -> Dict[str, Any]:
        """Analyze content for optimization opportunities using AI"""
        job_id = self.generate_job_id()
        
        try:
            job_tracker.create_job(
                job_id=job_id,
                operation="content_analysis",
                text_length=len(text)
            )
            
            # Analyze text characteristics
            analysis = {
                "readability": self._calculate_readability_score(text),
                "sentiment": await self._analyze_sentiment(text),
                "power_words": self._detect_power_words(text),
                "emotional_triggers": self._detect_emotional_triggers(text),
                "call_to_action_strength": self._analyze_cta_strength(text),
                "keyword_density": self._analyze_keyword_density(text),
                "length_optimization": self._analyze_length_optimization(text),
                "tone_consistency": await self._analyze_tone_consistency(text),
                "conversion_potential": self._calculate_conversion_potential(text)
            }
            
            # Generate improvement suggestions
            suggestions = await self._generate_improvement_suggestions(text, analysis)
            
            # Calculate overall score
            overall_score = self._calculate_overall_content_score(analysis)
            
            result = {
                "analysis": analysis,
                "suggestions": suggestions,
                "overall_score": overall_score,
                "optimization_priority": self._prioritize_optimizations(analysis),
                "job_id": job_id
            }
            
            job_tracker.set_job_completed(job_id, f"Content analysis complete - Score: {overall_score:.2f}")
            
            return result
            
        except Exception as e:
            job_tracker.set_job_failed(job_id, str(e))
            raise
    
    async def generate_industry_optimized_copy(
        self,
        context: str,
        industry: str,
        format_type: str,
        tone: TextToneEnum,
        target_audience: str = None
    ) -> TextGenerationResponse:
        """Generate copy optimized for specific industries with best practices"""
        job_id = self.generate_job_id()
        
        try:
            job_tracker.create_job(
                job_id=job_id,
                operation="industry_optimized_generation",
                industry=industry,
                format_type=format_type
            )
            
            # Get industry-specific context
            industry_context = self.industry_contexts.get(industry.lower(), {})
            
            # Enhanced context with industry insights
            enhanced_context = self._enhance_context_with_industry_data(
                context, industry_context, target_audience
            )
            
            # Create industry-optimized request
            request = TextGenerationRequest(
                context=enhanced_context,
                tone=tone,
                format_type=format_type,
                target_audience=target_audience,
                variation_count=5,
                max_length=self._get_industry_optimal_length(industry, format_type)
            )
            
            # Generate base variations
            response = await self.generate_text(request)
            
            # Post-process with industry optimization
            optimized_variations = []
            for variation in response.variations:
                optimized_text = await self._apply_industry_optimization(
                    variation.text, industry, format_type
                )
                
                # Recalculate confidence with industry factors
                industry_confidence = self._calculate_industry_confidence(
                    optimized_text, industry, format_type
                )
                
                optimized_variations.append(GeneratedText(
                    text=optimized_text,
                    confidence_score=industry_confidence
                ))
            
            # Sort by industry-specific confidence
            optimized_variations.sort(key=lambda x: x.confidence_score, reverse=True)
            
            # Create enhanced response
            enhanced_response = TextGenerationResponse(
                variations=optimized_variations,
                context=enhanced_context,
                tone=tone,
                job_id=job_id
            )
            
            job_tracker.set_job_completed(job_id, f"Industry-optimized copy for {industry}")
            
            return enhanced_response
            
        except Exception as e:
            job_tracker.set_job_failed(job_id, str(e))
            raise
    
    async def generate_personalized_sequences(
        self,
        base_context: str,
        personas: List[Dict[str, Any]],
        sequence_length: int = 3
    ) -> Dict[str, List[str]]:
        """Generate personalized content sequences for different user personas"""
        job_id = self.generate_job_id()
        
        try:
            job_tracker.create_job(
                job_id=job_id,
                operation="personalized_sequences",
                persona_count=len(personas),
                sequence_length=sequence_length
            )
            
            sequences = {}
            
            for i, persona in enumerate(personas):
                persona_name = persona.get("name", f"Persona_{i+1}")
                
                # Generate sequence for this persona
                sequence = []
                for step in range(sequence_length):
                    # Adjust context based on persona and sequence step
                    personalized_context = self._personalize_context(
                        base_context, persona, step, sequence_length
                    )
                    
                    # Generate content for this step
                    request = TextGenerationRequest(
                        context=personalized_context,
                        tone=self._get_persona_tone(persona),
                        format_type=self._get_sequence_format(step),
                        target_audience=persona.get("description", ""),
                        variation_count=1
                    )
                    
                    response = await self.generate_text(request)
                    if response.variations:
                        sequence.append(response.variations[0].text)
                
                sequences[persona_name] = sequence
                
                # Update progress
                progress = ((i + 1) / len(personas)) * 90.0
                job_tracker.set_job_processing(job_id, progress)
            
            job_tracker.set_job_completed(job_id, f"Generated sequences for {len(personas)} personas")
            
            return {
                "sequences": sequences,
                "persona_insights": self._generate_persona_insights(personas, sequences),
                "job_id": job_id
            }
            
        except Exception as e:
            job_tracker.set_job_failed(job_id, str(e))
            raise
    
    # Advanced helper methods for Phase 3
    
    def _create_specialized_request(
        self, 
        context: str, 
        format_type: str, 
        tone: TextToneEnum, 
        approach: str
    ) -> TextGenerationRequest:
        """Create specialized request based on A/B test approach"""
        approach_modifiers = {
            "emotional appeal": "Focus on emotional benefits and feelings",
            "logical reasoning": "Use facts, statistics, and logical arguments",
            "benefit-focused": "Emphasize outcomes and benefits for the user",
            "feature-focused": "Highlight specific features and capabilities",
            "urgency-driven": "Create sense of urgency and scarcity",
            "value-proposition": "Focus on value and long-term benefits",
            "question format": "Use questions to engage and provoke thought",
            "statement format": "Use confident statements and declarations"
        }
        
        modifier = approach_modifiers.get(approach, "")
        enhanced_context = f"{context}. {modifier}"
        
        return TextGenerationRequest(
            context=enhanced_context,
            tone=tone,
            format_type=format_type,
            variation_count=1
        )
    
    def _calculate_ab_confidence_score(
        self, 
        text: str, 
        request: TextGenerationRequest, 
        approach: str
    ) -> float:
        """Calculate confidence score for A/B test variations"""
        base_score = self._calculate_confidence_score(text, request)
        
        # Approach-specific scoring
        approach_bonuses = {
            "emotional appeal": self._score_emotional_content(text),
            "logical reasoning": self._score_logical_content(text),
            "urgency-driven": self._score_urgency_content(text),
            "benefit-focused": self._score_benefit_content(text)
        }
        
        approach_bonus = approach_bonuses.get(approach, 0.0)
        
        return min(1.0, base_score + approach_bonus)
    
    def _score_emotional_content(self, text: str) -> float:
        """Score text based on emotional content"""
        emotional_words = self.power_words["emotion"]
        found_words = sum(1 for word in emotional_words if word.lower() in text.lower())
        return min(0.2, found_words * 0.05)
    
    def _score_logical_content(self, text: str) -> float:
        """Score text based on logical structure"""
        logical_indicators = ["because", "therefore", "proven", "research", "data", "fact"]
        found_indicators = sum(1 for indicator in logical_indicators if indicator in text.lower())
        return min(0.2, found_indicators * 0.04)
    
    def _score_urgency_content(self, text: str) -> float:
        """Score text based on urgency indicators"""
        urgency_words = self.power_words["urgency"]
        found_words = sum(1 for word in urgency_words if word.lower() in text.lower())
        return min(0.2, found_words * 0.06)
    
    def _score_benefit_content(self, text: str) -> float:
        """Score text based on benefit presentation"""
        benefit_indicators = ["you get", "you'll", "your", "benefit", "advantage", "save", "gain"]
        found_indicators = sum(1 for indicator in benefit_indicators if indicator in text.lower())
        return min(0.2, found_indicators * 0.04)
    
    def _predict_winning_variation(self, results: Dict[str, List[GeneratedText]]) -> str:
        """Predict which A/B test variation is likely to perform better"""
        approach_scores = {}
        
        for approach, variations in results.items():
            avg_confidence = np.mean([v.confidence_score for v in variations])
            approach_scores[approach] = avg_confidence
        
        return max(approach_scores.items(), key=lambda x: x[1])[0]
    
    def _calculate_readability_score(self, text: str) -> float:
        """Calculate readability score (simplified Flesch Reading Ease)"""
        words = len(text.split())
        sentences = len(re.split(r'[.!?]+', text))
        syllables = sum(self._count_syllables(word) for word in text.split())
        
        if sentences == 0 or words == 0:
            return 0.0
        
        # Simplified Flesch Reading Ease formula
        score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words)
        return max(0.0, min(100.0, score)) / 100.0
    
    def _count_syllables(self, word: str) -> int:
        """Count syllables in a word (simplified)"""
        word = word.lower()
        vowels = "aeiouy"
        syllable_count = 0
        prev_was_vowel = False
        
        for char in word:
            is_vowel = char in vowels
            if is_vowel and not prev_was_vowel:
                syllable_count += 1
            prev_was_vowel = is_vowel
        
        # Handle silent 'e'
        if word.endswith('e') and syllable_count > 1:
            syllable_count -= 1
        
        return max(1, syllable_count)
    
    async def _analyze_sentiment(self, text: str) -> Dict[str, Any]:
        """Analyze sentiment using GPT-4"""
        try:
            sentiment_prompt = f"Analyze the sentiment of this text and return a JSON object with 'polarity' (positive/negative/neutral), 'intensity' (0.0-1.0), and 'emotional_tone' (list of emotions): {text}"
            
            request_data = {
                "model": "gpt-4",
                "messages": [
                    {"role": "user", "content": sentiment_prompt}
                ],
                "max_tokens": 100,
                "temperature": 0.1
            }
            
            response = await self.openai_client.post("/chat/completions", json=request_data)
            
            if response.status_code == 200:
                result = response.json()
                content = result["choices"][0]["message"]["content"]
                try:
                    return json.loads(content)
                except json.JSONDecodeError:
                    return {"polarity": "neutral", "intensity": 0.5, "emotional_tone": []}
            else:
                return {"polarity": "neutral", "intensity": 0.5, "emotional_tone": []}
                
        except Exception:
            return {"polarity": "neutral", "intensity": 0.5, "emotional_tone": []}
    
    def _detect_power_words(self, text: str) -> Dict[str, List[str]]:
        """Detect power words in text"""
        text_lower = text.lower()
        detected = {}
        
        for category, words in self.power_words.items():
            found_words = [word for word in words if word in text_lower]
            if found_words:
                detected[category] = found_words
        
        return detected
    
    def _detect_emotional_triggers(self, text: str) -> List[str]:
        """Detect emotional triggers in text"""
        triggers = {
            "fear": ["worry", "fear", "concern", "risk", "danger", "threat"],
            "desire": ["want", "wish", "dream", "desire", "crave", "yearn"],
            "pride": ["proud", "achievement", "success", "accomplishment", "victory"],
            "curiosity": ["wonder", "discover", "explore", "reveal", "secret", "mystery"]
        }
        
        detected_triggers = []
        text_lower = text.lower()
        
        for trigger_type, words in triggers.items():
            if any(word in text_lower for word in words):
                detected_triggers.append(trigger_type)
        
        return detected_triggers
    
    def _analyze_cta_strength(self, text: str) -> float:
        """Analyze call-to-action strength"""
        action_verbs = ["buy", "get", "start", "join", "download", "subscribe", "call", "click", "try", "order"]
        urgency_words = self.power_words["urgency"]
        
        text_lower = text.lower()
        
        action_score = sum(1 for verb in action_verbs if verb in text_lower) * 0.2
        urgency_score = sum(1 for word in urgency_words if word in text_lower) * 0.1
        
        return min(1.0, action_score + urgency_score)
    
    def _analyze_keyword_density(self, text: str) -> Dict[str, float]:
        """Analyze keyword density"""
        words = text.lower().split()
        word_count = Counter(words)
        total_words = len(words)
        
        # Get top keywords (excluding common words)
        common_words = {"the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by"}
        keywords = {word: count for word, count in word_count.most_common(10) 
                   if word not in common_words and len(word) > 2}
        
        # Calculate density
        densities = {word: (count / total_words) * 100 for word, count in keywords.items()}
        
        return densities
    
    def _analyze_length_optimization(self, text: str) -> Dict[str, Any]:
        """Analyze text length for optimization"""
        char_count = len(text)
        word_count = len(text.split())
        
        # Optimal lengths for different formats
        optimal_ranges = {
            "headline": {"chars": (30, 60), "words": (5, 10)},
            "body": {"chars": (100, 300), "words": (20, 60)},
            "cta": {"chars": (10, 30), "words": (2, 5)},
            "social": {"chars": (100, 280), "words": (20, 50)}
        }
        
        return {
            "character_count": char_count,
            "word_count": word_count,
            "optimization_suggestions": self._get_length_suggestions(char_count, word_count)
        }
    
    def _get_length_suggestions(self, char_count: int, word_count: int) -> List[str]:
        """Get length optimization suggestions"""
        suggestions = []
        
        if char_count > 300:
            suggestions.append("Consider shortening for better readability")
        elif char_count < 50:
            suggestions.append("Consider adding more detail or context")
        
        if word_count > 50:
            suggestions.append("Break into shorter sentences for impact")
        elif word_count < 5:
            suggestions.append("Consider expanding for clarity")
        
        return suggestions
    
    async def _analyze_tone_consistency(self, text: str) -> Dict[str, Any]:
        """Analyze tone consistency throughout text"""
        # This would use GPT-4 for detailed analysis
        # Simplified version for now
        return {
            "consistency_score": 0.8,
            "dominant_tone": "professional",
            "tone_variations": ["professional", "friendly"]
        }
    
    def _calculate_conversion_potential(self, text: str) -> float:
        """Calculate conversion potential score"""
        factors = [
            self._analyze_cta_strength(text) * 0.3,
            len(self._detect_power_words(text)) * 0.2,
            len(self._detect_emotional_triggers(text)) * 0.1,
            self._calculate_readability_score(text) * 0.2,
            min(1.0, len(text.split()) / 30) * 0.2  # Optimal length factor
        ]
        
        return min(1.0, sum(factors))
    
    async def _generate_improvement_suggestions(self, text: str, analysis: Dict[str, Any]) -> List[str]:
        """Generate AI-powered improvement suggestions"""
        suggestions = []
        
        # Readability suggestions
        if analysis["readability"] < 0.6:
            suggestions.append("Simplify language for better readability")
        
        # Power word suggestions
        if not analysis["power_words"]:
            suggestions.append("Add power words to increase impact")
        
        # CTA suggestions
        if analysis["call_to_action_strength"] < 0.5:
            suggestions.append("Strengthen call-to-action with action verbs")
        
        # Emotional trigger suggestions
        if not analysis["emotional_triggers"]:
            suggestions.append("Add emotional triggers to connect with audience")
        
        return suggestions
    
    def _calculate_overall_content_score(self, analysis: Dict[str, Any]) -> float:
        """Calculate overall content quality score"""
        weights = {
            "readability": 0.2,
            "conversion_potential": 0.3,
            "call_to_action_strength": 0.2,
            "sentiment": 0.1,  # Simplified sentiment scoring
            "power_words": 0.1,
            "emotional_triggers": 0.1
        }
        
        scores = {
            "readability": analysis["readability"],
            "conversion_potential": analysis["conversion_potential"],
            "call_to_action_strength": analysis["call_to_action_strength"],
            "sentiment": 0.8,  # Placeholder
            "power_words": min(1.0, len(analysis["power_words"]) * 0.2),
            "emotional_triggers": min(1.0, len(analysis["emotional_triggers"]) * 0.3)
        }
        
        weighted_score = sum(scores[factor] * weight for factor, weight in weights.items())
        return weighted_score
    
    def _prioritize_optimizations(self, analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Prioritize optimization recommendations"""
        priorities = []
        
        if analysis["call_to_action_strength"] < 0.5:
            priorities.append({
                "priority": "high",
                "area": "call_to_action",
                "impact": "high",
                "effort": "low"
            })
        
        if analysis["readability"] < 0.6:
            priorities.append({
                "priority": "medium",
                "area": "readability",
                "impact": "medium",
                "effort": "medium"
            })
        
        if not analysis["power_words"]:
            priorities.append({
                "priority": "medium",
                "area": "power_words",
                "impact": "medium",
                "effort": "low"
            })
        
        return sorted(priorities, key=lambda x: {"high": 3, "medium": 2, "low": 1}[x["priority"]], reverse=True)
    
    def _enhance_context_with_industry_data(
        self, 
        context: str, 
        industry_context: Dict[str, Any], 
        target_audience: str
    ) -> str:
        """Enhance context with industry-specific insights"""
        enhanced = context
        
        if industry_context:
            keywords = industry_context.get("keywords", [])
            pain_points = industry_context.get("pain_points", [])
            benefits = industry_context.get("benefits", [])
            
            enhanced += f"\n\nIndustry context: Focus on {', '.join(keywords[:3])}."
            enhanced += f" Address pain points: {', '.join(pain_points[:2])}."
            enhanced += f" Highlight benefits: {', '.join(benefits[:2])}."
        
        if target_audience:
            enhanced += f"\n\nTarget audience: {target_audience}"
        
        return enhanced
    
    def _get_industry_optimal_length(self, industry: str, format_type: str) -> int:
        """Get optimal length for industry and format combination"""
        industry_modifiers = {
            "healthcare": 1.2,  # Longer for trust and authority
            "finance": 1.1,     # Slightly longer for credibility
            "ecommerce": 0.9,   # Shorter for quick decisions
            "saas": 1.0         # Standard length
        }
        
        base_lengths = {
            "headline": 60,
            "body": 200,
            "cta": 25,
            "social": 150
        }
        
        base_length = base_lengths.get(format_type, 200)
        modifier = industry_modifiers.get(industry.lower(), 1.0)
        
        return int(base_length * modifier)
    
    async def _apply_industry_optimization(
        self, 
        text: str, 
        industry: str, 
        format_type: str
    ) -> str:
        """Apply industry-specific optimizations to text"""
        industry_context = self.industry_contexts.get(industry.lower(), {})
        
        if not industry_context:
            return text
        
        # Simple keyword injection (would be more sophisticated in production)
        keywords = industry_context.get("keywords", [])
        if keywords and len(text.split()) < 10:  # Only for short text
            # Try to naturally incorporate a relevant keyword
            selected_keyword = random.choice(keywords[:2])
            if selected_keyword.lower() not in text.lower():
                # Simple integration logic
                text = text.replace("solution", selected_keyword) if "solution" in text else text
        
        return text
    
    def _calculate_industry_confidence(
        self, 
        text: str, 
        industry: str, 
        format_type: str
    ) -> float:
        """Calculate confidence score with industry-specific factors"""
        base_score = 0.8
        
        industry_context = self.industry_contexts.get(industry.lower(), {})
        if not industry_context:
            return base_score
        
        # Check for industry keywords
        keywords = industry_context.get("keywords", [])
        keyword_score = sum(1 for keyword in keywords if keyword.lower() in text.lower()) * 0.05
        
        # Check for benefit mentions
        benefits = industry_context.get("benefits", [])
        benefit_score = sum(1 for benefit in benefits if benefit.lower() in text.lower()) * 0.03
        
        return min(1.0, base_score + keyword_score + benefit_score)
    
    def _personalize_context(
        self, 
        base_context: str, 
        persona: Dict[str, Any], 
        step: int, 
        total_steps: int
    ) -> str:
        """Personalize context for specific persona and sequence step"""
        persona_context = base_context
        
        # Add persona-specific information
        if "pain_points" in persona:
            persona_context += f"\n\nAddress these specific concerns: {', '.join(persona['pain_points'])}"
        
        if "preferences" in persona:
            persona_context += f"\n\nPersonality preferences: {', '.join(persona['preferences'])}"
        
        # Add sequence-specific context
        sequence_contexts = {
            0: "Introduction and awareness",
            1: "Consideration and evaluation", 
            2: "Decision and action"
        }
        
        if step < len(sequence_contexts):
            persona_context += f"\n\nSequence focus: {sequence_contexts[step]}"
        
        return persona_context
    
    def _get_persona_tone(self, persona: Dict[str, Any]) -> TextToneEnum:
        """Get appropriate tone for persona"""
        tone_mapping = {
            "conservative": TextToneEnum.FORMAL,
            "casual": TextToneEnum.CASUAL,
            "professional": TextToneEnum.PROFESSIONAL,
            "friendly": TextToneEnum.FRIENDLY,
            "analytical": TextToneEnum.SERIOUS
        }
        
        persona_type = persona.get("type", "professional")
        return tone_mapping.get(persona_type, TextToneEnum.PROFESSIONAL)
    
    def _get_sequence_format(self, step: int) -> str:
        """Get format type for sequence step"""
        sequence_formats = {
            0: "headline",
            1: "body", 
            2: "cta"
        }
        
        return sequence_formats.get(step, "body")
    
    def _generate_persona_insights(
        self, 
        personas: List[Dict[str, Any]], 
        sequences: Dict[str, List[str]]
    ) -> Dict[str, Any]:
        """Generate insights about persona-specific content performance"""
        insights = {
            "total_personas": len(personas),
            "average_sequence_length": np.mean([len(seq) for seq in sequences.values()]),
            "persona_characteristics": {},
            "content_variations": {}
        }
        
        # Analyze persona characteristics
        for persona in personas:
            persona_name = persona.get("name", "Unknown")
            insights["persona_characteristics"][persona_name] = {
                "type": persona.get("type", "unknown"),
                "pain_points": persona.get("pain_points", []),
                "sequence_length": len(sequences.get(persona_name, []))
            }
        
        return insights
    
    async def close(self):
        """Close the service and cleanup resources"""
        if self.openai_client:
            await self.openai_client.aclose()
        if self.deepl_client:
            await self.deepl_client.aclose()


# Global service instance
text_generation_service = TextGenerationService()