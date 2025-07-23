/**
 * Vercel Serverless Function for AI Text Generation
 * OpenAI GPT-4 integration for professional marketing copy
 */

const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Tone prompts for different writing styles
const TONE_PROMPTS = {
  professional: "Write in a professional, business-appropriate tone.",
  friendly: "Write in a warm, friendly, and approachable tone.",
  confident: "Write in a confident, assertive tone.",
  casual: "Write in a casual, conversational tone.",
  formal: "Write in a formal, sophisticated tone.",
  optimistic: "Write in an optimistic, positive tone.",
  serious: "Write in a serious, authoritative tone.",
  humorous: "Write in a light, humorous tone.",
  emotional: "Write in an emotional, compelling tone.",
  assertive: "Write in a strong, assertive tone."
};

// Fallback responses for when API fails
const FALLBACK_RESPONSES = {
  professional: [
    "Unlock Your Financial Future with Kredivo",
    "Smart Credit Solutions for Modern Living",
    "Your Trusted Partner in Financial Growth"
  ],
  friendly: [
    "Making Credit Simple and Accessible",
    "Your Friend in Financial Success",
    "Easy Credit, Happy Life"
  ],
  confident: [
    "Take Control of Your Financial Future",
    "Bold Moves, Smart Credit",
    "Confidence in Every Transaction"
  ]
};

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      processing_time: 0
    });
  }

  const startTime = Date.now();

  try {
    const { prompt, tone = 'professional', max_length = 100, variations = 1 } = req.body;

    // Validate input
    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required',
        processing_time: (Date.now() - startTime) / 1000
      });
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.log('⚠️ OpenAI API key not configured, using fallback responses');
      
      const fallbackTexts = FALLBACK_RESPONSES[tone] || FALLBACK_RESPONSES.professional;
      
      return res.status(200).json({
        success: true,
        data: {
          texts: fallbackTexts.slice(0, variations),
          tone,
          prompt,
          fallback: true,
          fallback_reason: 'OpenAI API key not configured'
        },
        processing_time: (Date.now() - startTime) / 1000
      });
    }

    console.log(`🤖 Generating text with OpenAI GPT-4: "${prompt}" in ${tone} tone`);

    // Create system prompt
    const systemPrompt = `You are a professional copywriter for advertising and marketing materials. 
    ${TONE_PROMPTS[tone] || TONE_PROMPTS.professional}
    Keep responses under ${max_length} characters and make them compelling for advertising use.
    Focus on creating engaging, actionable content that drives results.`;

    // Generate text using OpenAI GPT-4
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      max_tokens: Math.floor(max_length / 2),
      temperature: 0.8,
      n: variations
    });

    // Extract generated texts
    const texts = response.choices
      .map(choice => choice.message?.content?.trim())
      .filter(text => text && text.length > 0);

    if (texts.length === 0) {
      throw new Error('No text generated from OpenAI');
    }

    const processingTime = (Date.now() - startTime) / 1000;
    console.log(`✅ Generated ${texts.length} text(s) in ${processingTime.toFixed(2)}s`);

    return res.status(200).json({
      success: true,
      data: {
        texts,
        tone,
        prompt
      },
      processing_time: processingTime
    });

  } catch (error) {
    const processingTime = (Date.now() - startTime) / 1000;
    console.error('❌ Text generation failed:', error.message);

    // Provide fallback response
    const { tone = 'professional', variations = 1 } = req.body;
    const fallbackTexts = FALLBACK_RESPONSES[tone] || FALLBACK_RESPONSES.professional;

    return res.status(200).json({
      success: true,
      data: {
        texts: fallbackTexts.slice(0, variations),
        tone,
        prompt: req.body.prompt || 'Default prompt',
        fallback: true,
        fallback_reason: error.message
      },
      processing_time: processingTime
    });
  }
}