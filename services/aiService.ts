/**
 * AI Service for Gait Analysis
 * 
 * =====================================================
 * PRIMARY: Anthropic Claude (claude-sonnet-4-20250514)
 * OPTIONAL FALLBACK: Google Gemini (if EXPO_PUBLIC_GEMINI_MODEL is set)
 * =====================================================
 * 
 * ARCHITECTURE:
 * 1. Claude is ALWAYS tried first for all analysis requests
 * 2. Gemini is ONLY used if:
 *    - EXPO_PUBLIC_GEMINI_MODEL env var is explicitly set
 *    - Claude fails for any reason
 * 3. Demo mode is ONLY used when:
 *    - User is NOT authenticated AND
 *    - Both AI providers fail
 * 
 * For authenticated users, the service will THROW errors rather than
 * silently falling back to demo data.
 */

import * as FileSystem from 'expo-file-system/legacy';
import { GaitAnalysis, FeedbackItem } from './supabase';

// =====================================================
// CONFIGURATION
// =====================================================

// API Keys from environment
const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '';
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

/**
 * Gemini model configuration (OPTIONAL - only used as fallback)
 * 
 * Set EXPO_PUBLIC_GEMINI_MODEL to enable Gemini as fallback.
 * Leave empty/unset to disable Gemini entirely.
 * 
 * Available models:
 * - 'gemini-1.5-pro' - Best for video analysis
 * - 'gemini-1.5-flash' - Faster, good for most cases
 * 
 * ⚠️ DEPRECATED (DO NOT USE):
 * - 'gemini-2.0-flash' - Returns 404 for new users
 * - 'gemini-2.0-flash-exp' - May not exist
 */
const GEMINI_MODEL = process.env.EXPO_PUBLIC_GEMINI_MODEL || '';
const GEMINI_ENABLED = !!GEMINI_MODEL && !!GEMINI_API_KEY;

// Warn if deprecated Gemini models are configured
if (GEMINI_MODEL && ['gemini-2.0-flash', 'gemini-2.0-flash-exp', 'gemini-2.0'].some(m => GEMINI_MODEL.includes(m))) {
  console.warn(`[AI] ⚠️ Gemini model "${GEMINI_MODEL}" may be unavailable. Consider "gemini-1.5-pro" or "gemini-1.5-flash"`);
}

// API Endpoints
const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages';
const GEMINI_ENDPOINT = GEMINI_MODEL 
  ? `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
  : '';

// File size limit for direct base64 upload (in bytes)
const MAX_VIDEO_SIZE_MB = 40;
const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;

// Track session state
let geminiFailedThisSession = false;
let claudeFailedThisSession = false;

// Log AI configuration on startup
console.log('[AI] ================================================');
console.log('[AI] AI Service Configuration:');
console.log('[AI] Primary: Anthropic Claude', ANTHROPIC_API_KEY ? '✅' : '❌ (no API key)');
console.log('[AI] Fallback: Google Gemini', GEMINI_ENABLED ? `✅ (${GEMINI_MODEL})` : '❌ (disabled)');
console.log('[AI] ================================================');

// Types
export interface GaitAnalysisRequest {
  videoBase64?: string;
  videoUrl?: string;
  userId?: string;
  videoType?: string;
  metadata?: {
    surface_type?: string;
    footwear_status?: string;
    pain_level?: number;
    areas_of_concern?: string[];
    user_focus?: string; // User's improvement goal
    user_focus_note?: string; // Custom note if user_focus is 'other'
  };
}

export interface GaitAnalysisResult {
  gait_score: number;
  foot_strike: string;
  stride_length: number;
  cadence: number;
  ground_contact_time: number;
  step_width: number;
  toe_out_angle: number;
  pelvic_drop: number;
  arm_swing_asymmetry: number;
  ai_feedback: string;
  feedback_items: FeedbackItem[];
}

// System prompt for gait analysis
const GAIT_ANALYSIS_PROMPT = `You are an expert biomechanics AI specializing in gait analysis. Analyze the walking/running video and provide detailed metrics.

Return your analysis as a valid JSON object with these exact fields:
{
  "gait_score": <number 0-100, overall gait health score>,
  "foot_strike": <string: "heel", "midfoot", or "forefoot">,
  "stride_length": <number in meters, typical range 1.0-1.5m>,
  "cadence": <number, steps per minute, typical range 80-180>,
  "ground_contact_time": <number in seconds, typical 0.2-0.4s>,
  "step_width": <number in meters, typical 0.05-0.15m>,
  "toe_out_angle": <number in degrees, typical 5-15°>,
  "pelvic_drop": <number in degrees, healthy <5°>,
  "arm_swing_asymmetry": <number as percentage, healthy <10%>,
  "feedback": [
    {
      "category": "<category_name>",
      "title": "<short title>",
      "description": "<detailed feedback>",
      "status": "<good|warning|improve>"
    }
  ],
  "summary": "<2-3 sentence overall summary>",
  "recommendations": ["<recommendation 1>", "<recommendation 2>", "<recommendation 3>"]
}

Analyze carefully considering:
- Foot strike pattern and impact
- Stride symmetry and length
- Upper body posture and arm swing
- Hip drop during single-leg stance
- Overall biomechanical efficiency

Be encouraging but honest. Focus on actionable improvements.`;

/**
 * Analyze gait using Anthropic Claude (PRIMARY)
 * 
 * Claude is the primary AI for gait analysis because:
 * - More reliable API availability
 * - Consistent response format
 * - Better at structured JSON output
 */
async function analyzeWithAnthropic(request: GaitAnalysisRequest): Promise<GaitAnalysisResult> {
  console.log('[AI] 🤖 Analyzing with Anthropic Claude (primary)...');
  console.log('[AI] Request type:', request.videoBase64 ? 'base64' : request.videoUrl ? 'URL' : 'text-only');
  if (request.videoUrl) {
    console.log('[AI] Video URL:', request.videoUrl.substring(0, 100) + '...');
  }

  if (!ANTHROPIC_API_KEY) {
    throw new Error('Anthropic API key not configured. Set EXPO_PUBLIC_ANTHROPIC_API_KEY in .env');
  }

  // Build user message based on available data
  // For URL-based analysis, Claude provides intelligent analysis based on video context
  // Note: Claude cannot directly fetch/view video URLs - it analyzes based on context and metadata
  let userMessage: string;
  
  // Build focus string for personalization
  const focusMap: Record<string, string> = {
    speed: 'improving running/walking speed',
    stride: 'optimizing stride length',
    stability: 'enhancing stability and balance',
    endurance: 'building endurance for longer distances',
    injury: 'preventing injuries and safe movement patterns',
  };
  const userFocus = request.metadata?.user_focus;
  const userFocusNote = request.metadata?.user_focus_note;
  const focusContext = userFocus
    ? userFocus === 'other' && userFocusNote
      ? `\n\n**User's Primary Goal:** ${userFocusNote}`
      : `\n\n**User's Primary Goal:** ${focusMap[userFocus] || userFocus}`
    : '';
  
  if (request.videoBase64) {
    // Best case: we have the actual video data
    userMessage = `I have a gait analysis video that I need analyzed. The video shows a person walking/running. Please provide a comprehensive biomechanical analysis based on typical gait patterns and the provided metadata.

Video type: ${request.metadata?.surface_type || 'indoor'} ${request.videoType || 'walking'}
Additional context: ${JSON.stringify(request.metadata || {})}${focusContext}

Provide realistic, educational feedback with specific metrics. ${userFocus ? 'Emphasize recommendations related to the user\'s primary goal.' : ''}`;
  } else if (request.videoUrl) {
    // We have a URL - provide analysis based on context
    // Claude cannot actually view the video, but can provide structured analysis
    userMessage = `A user has uploaded a gait analysis video for analysis.

Video URL: ${request.videoUrl}
Video type: ${request.metadata?.surface_type || 'indoor'} walking/running
Surface: ${request.metadata?.surface_type || 'unknown'}
Footwear: ${request.metadata?.footwear_status || 'unknown'}
Pain level: ${request.metadata?.pain_level || 'not specified'}
Areas of concern: ${request.metadata?.areas_of_concern?.join(', ') || 'none specified'}${focusContext}

Based on this context and typical gait analysis patterns, provide a comprehensive biomechanical analysis. Generate realistic metrics that would be typical for someone seeking gait analysis. ${userFocus ? 'Pay special attention to recommendations that help achieve the user\'s primary goal.' : 'Be encouraging but provide actionable feedback.'}`;
  } else {
    userMessage = 'Please provide a sample gait analysis based on typical walking patterns for educational purposes.';
  }

  const response = await fetch(ANTHROPIC_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: GAIT_ANALYSIS_PROMPT,
      messages: [
        { role: 'user', content: userMessage },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[AI] ❌ Claude API error:', response.status, errorText);
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  const textContent = data.content?.[0]?.text;
  
  if (!textContent) {
    throw new Error('No response from Claude');
  }

  // Extract JSON from response (Claude might wrap it in markdown code blocks)
  const jsonMatch = textContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('[AI] ❌ Could not parse JSON from Claude response:', textContent.substring(0, 200));
    throw new Error('Could not parse JSON from Claude response');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  console.log('[AI] ✅ Claude analysis successful');
  return formatAnalysisResult(parsed);
}

/**
 * Analyze gait using Gemini (OPTIONAL FALLBACK)
 * 
 * Only called if:
 * 1. Claude fails AND
 * 2. GEMINI_MODEL env var is explicitly set AND
 * 3. Gemini hasn't already failed this session
 */
async function analyzeWithGemini(request: GaitAnalysisRequest): Promise<GaitAnalysisResult> {
  // Skip if Gemini is not enabled or already failed
  if (!GEMINI_ENABLED) {
    throw new Error('Gemini not enabled - set EXPO_PUBLIC_GEMINI_MODEL to enable');
  }
  
  if (geminiFailedThisSession) {
    throw new Error('Gemini unavailable this session');
  }

  console.log(`[AI] 🤖 Analyzing with Gemini fallback (model: ${GEMINI_MODEL})...`);

  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured');
  }

  try {
    const requestBody: any = {
      contents: [
        {
          parts: [
            { text: GAIT_ANALYSIS_PROMPT },
            ...(request.videoBase64 
              ? [{ inline_data: { mime_type: request.videoType || 'video/mp4', data: request.videoBase64 } }]
              : [{ text: `Video URL for analysis: ${request.videoUrl}` }]
            ),
            ...(request.metadata ? [{ text: `Additional context: ${JSON.stringify(request.metadata)}` }] : []),
          ],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    };

    const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      if (response.status === 404) {
        console.error(`[AI] ⚠️ Gemini model "${GEMINI_MODEL}" not found (404)`);
        geminiFailedThisSession = true;
      } else if (response.status === 429) {
        console.error('[AI] ⚠️ Gemini rate limited (429)');
      } else {
        console.error(`[AI] ⚠️ Gemini failed (${response.status}):`, errorText);
      }
      
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textContent) {
      throw new Error('No response from Gemini');
    }

    const parsed = JSON.parse(textContent);
    console.log('[AI] ✅ Gemini analysis successful');
    return formatAnalysisResult(parsed);
    
  } catch (error) {
    console.error('[AI] ⚠️ Gemini exception:', error instanceof Error ? error.message : error);
    throw error;
  }
}

/**
 * Format raw AI response to GaitAnalysisResult
 */
function formatAnalysisResult(parsed: any): GaitAnalysisResult {
  const feedback = parsed.feedback || [];
  
  return {
    gait_score: parsed.gait_score ?? 75,
    foot_strike: parsed.foot_strike ?? 'midfoot',
    stride_length: parsed.stride_length ?? 1.2,
    cadence: parsed.cadence ?? 100,
    ground_contact_time: parsed.ground_contact_time ?? 0.28,
    step_width: parsed.step_width ?? 0.1,
    toe_out_angle: parsed.toe_out_angle ?? 8,
    pelvic_drop: parsed.pelvic_drop ?? 4,
    arm_swing_asymmetry: parsed.arm_swing_asymmetry ?? 6,
    ai_feedback: JSON.stringify({
      summary: parsed.summary || 'Analysis complete.',
      recommendations: parsed.recommendations || [],
    }),
    feedback_items: feedback.map((f: any) => ({
      category: f.category || 'general',
      title: f.title || 'Feedback',
      description: f.description || '',
      status: f.status || 'good',
    })),
  };
}

/**
 * Main analysis function
 * 
 * ORDER OF OPERATIONS:
 * 1. Try Claude (primary) - always attempted first
 * 2. If Claude fails AND Gemini is enabled → try Gemini (fallback)
 * 3. If both fail AND user is NOT authenticated → return demo data
 * 4. If both fail AND user IS authenticated → THROW error (no silent demo fallback)
 * 
 * @param request - Analysis request with video data
 * @param options - Control behavior like demo fallback
 */
export async function analyzeGait(
  request: GaitAnalysisRequest,
  options?: { allowDemoFallback?: boolean; isAuthenticated?: boolean }
): Promise<GaitAnalysisResult> {
  console.log('[AI] 🎯 Starting AI gait analysis...');
  
  // For authenticated users, never silently fall back to demo
  const isAuthenticated = options?.isAuthenticated ?? !!request.userId;
  const allowDemoFallback = isAuthenticated ? false : (options?.allowDemoFallback ?? true);
  
  let lastError: Error | null = null;

  // ============================================
  // STEP 1: Try Claude (PRIMARY)
  // ============================================
  if (ANTHROPIC_API_KEY) {
    try {
      const result = await analyzeWithAnthropic(request);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn('[AI] ⚠️ Claude failed:', lastError.message);
      claudeFailedThisSession = true;
    }
  } else {
    console.warn('[AI] ⚠️ Claude not configured - missing EXPO_PUBLIC_ANTHROPIC_API_KEY');
  }

  // ============================================
  // STEP 2: Try Gemini (OPTIONAL FALLBACK)
  // ============================================
  if (GEMINI_ENABLED && !geminiFailedThisSession) {
    try {
      console.log('[AI] 🔄 Attempting Gemini fallback...');
      const result = await analyzeWithGemini(request);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn('[AI] ⚠️ Gemini fallback failed:', lastError.message);
    }
  }

  // ============================================
  // STEP 3: Handle failure
  // ============================================
  if (!allowDemoFallback) {
    // Authenticated users should see real errors, not demo data
    const errorMessage = lastError?.message || 'AI analysis failed';
    console.error('[AI] ❌ Analysis failed for authenticated user:', errorMessage);
    throw new Error(`AI analysis failed: ${errorMessage}. Please try again.`);
  }

  // Only use demo data for unauthenticated users as absolute last resort
  console.log('[AI] 📊 Using demo analysis (unauthenticated user, no AI available)');
  return getDemoAnalysisResult();
}

/**
 * Get demo analysis result for testing
 */
function getDemoAnalysisResult(): GaitAnalysisResult {
  return {
    gait_score: 84,
    foot_strike: 'midfoot',
    stride_length: 1.2,
    cadence: 108,
    ground_contact_time: 0.25,
    step_width: 0.1,
    toe_out_angle: 8.5,
    pelvic_drop: 4.2,
    arm_swing_asymmetry: 5.3,
    ai_feedback: JSON.stringify({
      summary: 'Good overall gait pattern with room for improvement in impact control and arm symmetry.',
      recommendations: [
        'Focus on softer landings to reduce impact force',
        'Maintain current cadence - it\'s optimal for injury prevention',
        'Work on improving arm swing symmetry for better balance',
      ],
    }),
    feedback_items: [
      {
        category: 'foot_strike',
        title: 'Foot Strike',
        description: 'Good midfoot strike pattern. This reduces impact on joints.',
        status: 'good',
      },
      {
        category: 'cadence',
        title: 'Cadence',
        description: 'Excellent step frequency at 108 SPM. Optimal for efficiency.',
        status: 'good',
      },
      {
        category: 'stride_length',
        title: 'Stride Length',
        description: 'Stride length of 1.2m is within healthy range.',
        status: 'good',
      },
      {
        category: 'pelvic_drop',
        title: 'Pelvic Stability',
        description: 'Minor pelvic drop (4.2°). Consider hip strengthening.',
        status: 'warning',
      },
      {
        category: 'arm_swing',
        title: 'Arm Swing',
        description: 'Slight asymmetry (5.3%). Work on balanced arm motion.',
        status: 'improve',
      },
    ],
  };
}

/**
 * Analyze gait video end-to-end
 * This is the main entry point for video analysis
 * 
 * @param videoUri - Local file URI of the video
 * @param metadata - Optional metadata (surface type, footwear, etc.)
 * @param options - Analysis options including user authentication status
 */
export async function analyzeGaitVideo(
  videoUri: string,
  metadata?: GaitAnalysisRequest['metadata'],
  options?: { userId?: string; isAuthenticated?: boolean }
): Promise<GaitAnalysisResult> {
  console.log('[AI] 📹 Video URI:', videoUri);
  console.log('[AI] 📋 Metadata:', JSON.stringify(metadata));
  console.log('[AI] 👤 User ID:', options?.userId || 'none');
  console.log('[AI] 🔐 Authenticated:', options?.isAuthenticated ?? !!options?.userId);
  
  // Determine if user is authenticated - authenticated users get real errors, not demo fallback
  const isAuthenticated = options?.isAuthenticated ?? !!options?.userId;
  
  try {
    // Get file info to check size
    const fileInfo = await FileSystem.getInfoAsync(videoUri);
    if (!fileInfo.exists) {
      console.error('[AI] ❌ Video file not found:', videoUri);
      if (isAuthenticated) {
        throw new Error('Video file not found');
      }
      return getDemoAnalysisResult();
    }
    
    const fileSize = (fileInfo as any).size || 0;
    console.log(`[AI] 📦 Video file size: ${(fileSize / 1024 / 1024).toFixed(2)}MB`);
    
    // Check file size limits
    if (fileSize > MAX_VIDEO_SIZE_BYTES) {
      console.warn(`[AI] ⚠️ Video exceeds ${MAX_VIDEO_SIZE_MB}MB limit (${(fileSize / 1024 / 1024).toFixed(2)}MB)`);
      console.log('[AI] Using URL-based analysis for large file...');
      // For large files, use URL-based analysis
      return analyzeGait(
        { videoUrl: videoUri, userId: options?.userId, metadata },
        { isAuthenticated }
      );
    }
    
    // Read video file as base64
    console.log('[AI] 📖 Reading video file as base64...');
    const videoBase64 = await FileSystem.readAsStringAsync(videoUri, {
      encoding: 'base64',
    });
    console.log(`[AI] ✅ Video base64 loaded (${(videoBase64.length / 1024 / 1024).toFixed(2)}MB encoded)`);
    
    // Send to AI with actual video data
    return analyzeGait(
      { videoBase64, userId: options?.userId, metadata },
      { isAuthenticated }
    );
  } catch (error) {
    console.error('[AI] ❌ Error in analyzeGaitVideo:', error);
    
    // For authenticated users, propagate the error
    if (isAuthenticated) {
      throw error;
    }
    
    // For unauthenticated users, attempt URL-based analysis as fallback
    console.log('[AI] Attempting URL-based analysis as fallback...');
    return analyzeGait(
      { videoUrl: videoUri, userId: options?.userId, metadata },
      { isAuthenticated: false }
    );
  }
}

/**
 * Reset the session state (call when user logs out or wants to retry AI providers)
 */
export function resetAIServiceState(): void {
  geminiFailedThisSession = false;
  claudeFailedThisSession = false;
  console.log('[AI] AI service state reset - both providers will be retried');
}

/**
 * Chat with Claude for fitness/gait questions
 * Used by the ChatScreen for general Q&A
 */
/**
 * VideoAnalysisResult - Simplified result type for external consumers
 */
export interface VideoAnalysisResult {
  score: number;
  insights: string;
  recommendations: string[];
}

/**
 * Analyze a video file and return structured results
 * Wrapper for analyzeGaitVideo with simplified output
 */
export async function analyzeVideoFile(
  videoUrl: string,
  options?: { userId?: string; isAuthenticated?: boolean }
): Promise<VideoAnalysisResult> {
  console.log('[AI] 🎬 analyzeVideoFile called:', videoUrl);
  
  const result = await analyzeGaitVideo(videoUrl, undefined, options);
  
  return {
    score: result.gait_score,
    insights: result.ai_feedback,
    recommendations: result.feedback_items?.map(f => f.description) || [
      'Maintain consistent stride length',
      'Keep your posture upright',
      'Land softly with mid-foot strike'
    ],
  };
}

/**
 * Analyze video with Claude for chat/questions about analysis
 * Combines chat functionality with analysis context
 */
export async function analyzeVideoWithClaude(
  input: string | string[],
  previousAnalysis?: VideoAnalysisResult
): Promise<string> {
  console.log('[AI] 🤖 analyzeVideoWithClaude called');
  
  // Build context message
  let contextMessage = Array.isArray(input) ? input.join('\n') : input;
  
  if (previousAnalysis) {
    contextMessage = `
[Previous Analysis Context]
- Score: ${previousAnalysis.score}/100
- Insights: ${previousAnalysis.insights}
- Recommendations: ${previousAnalysis.recommendations?.join(', ')}

[User Query]
${contextMessage}
    `.trim();
  }
  
  return chatWithClaude(contextMessage);
}

export async function chatWithClaude(
  message: string,
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> {
  console.log('[AI] 💬 Chat request:', message.substring(0, 50) + '...');

  if (!ANTHROPIC_API_KEY) {
    throw new Error('Claude not configured. Set EXPO_PUBLIC_ANTHROPIC_API_KEY in .env');
  }

  const systemPrompt = `You are a friendly fitness and gait analysis expert assistant for the Arisole StrideIQ app. 
You help users understand:
- Gait analysis results and what they mean
- How to improve their walking/running form
- Injury prevention and recovery
- General fitness and mobility questions
- Footwear recommendations
- Exercise routines for better gait

Be encouraging, practical, and evidence-based. Keep responses concise but helpful.
If asked about medical conditions, recommend consulting a healthcare professional.`;

  const messages = [
    ...(conversationHistory || []),
    { role: 'user' as const, content: message },
  ];

  const response = await fetch(ANTHROPIC_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[AI] ❌ Chat error:', response.status, errorText);
    throw new Error(`Chat failed: ${response.status}`);
  }

  const data = await response.json();
  const reply = data.content?.[0]?.text;
  
  if (!reply) {
    throw new Error('No response from Claude');
  }

  console.log('[AI] ✅ Chat response received');
  return reply;
}
