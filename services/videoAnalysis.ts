/**
 * Video Analysis Service
 * 
 * Orchestrates video upload and AI analysis flow.
 * Uses Anthropic Claude (primary) for analysis.
 * Integrates user's focus preference for personalized recommendations.
 */

import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  uploadVideo, 
  updateAnalysisResults, 
  getGaitAnalysis,
  GaitAnalysis,
  FeedbackItem,
  parseAiFeedback,
} from './supabase';
import { 
  analyzeGait, 
  analyzeGaitVideo as aiAnalyzeVideo,
  GaitAnalysisResult,
} from './aiService';

// Re-export types for convenience
export type { GaitAnalysisResult, FeedbackItem };

// Analysis metadata
export interface AnalysisMetadata {
  video_type?: 'walking' | 'running' | 'stairs';
  surface_type?: 'treadmill' | 'outdoor' | 'indoor' | 'trail';
  footwear_status?: 'barefoot' | 'shoes' | 'running_shoes' | 'boots';
  pain_level?: number;
  areas_of_concern?: string[];
  user_focus?: string; // User's improvement goal: speed, stride, stability, endurance, injury, other
  user_focus_note?: string; // Custom note if user_focus is 'other'
}

// Storage key for user's gait focus preference
const FOCUS_STORAGE_KEY = '@arisole_gait_focus';

// Analysis status callback
export type AnalysisStatusCallback = (status: string, progress: number) => void;

/**
 * Complete video analysis flow
 * 1. Upload video to Supabase Storage (get HTTPS URL)
 * 2. Create analysis record
 * 3. Run AI analysis using PUBLIC URL (not local file://)
 * 4. Update record with results
 * 
 * IMPORTANT: Claude cannot access file:// URIs. We must:
 * - Upload to Supabase first
 * - Get the public HTTPS URL
 * - Pass that URL to Claude for analysis
 */
export async function processVideoAnalysis(
  videoUri: string,
  metadata?: AnalysisMetadata,
  onStatusChange?: AnalysisStatusCallback
): Promise<GaitAnalysis | null> {
  try {
    // Get user's focus preference for personalized recommendations
    let enrichedMetadata = { ...metadata };
    try {
      const savedFocus = await AsyncStorage.getItem(FOCUS_STORAGE_KEY);
      if (savedFocus) {
        const { focus, note } = JSON.parse(savedFocus);
        enrichedMetadata.user_focus = focus;
        if (note) enrichedMetadata.user_focus_note = note;
        console.log('[VideoAnalysis] 🎯 User focus:', focus, note ? `(${note})` : '');
      }
    } catch (e) {
      console.log('[VideoAnalysis] No saved focus preference');
    }

    // Step 1: Upload video to get public HTTPS URL
    onStatusChange?.('Uploading video...', 10);
    const uploadResult = await uploadVideo(videoUri, enrichedMetadata, { requireAuth: true });
    
    if (!uploadResult.success || !uploadResult.analysisId) {
      console.error('[VideoAnalysis] ❌ Upload failed:', uploadResult.error);
      throw new Error(uploadResult.error || 'Video upload failed');
    }

    const analysisId = uploadResult.analysisId;
    const publicVideoUrl = uploadResult.videoUrl;
    
    console.log('📹 Video uploaded successfully!');
    console.log('   Analysis ID:', analysisId);
    console.log('   Public URL:', publicVideoUrl);

    // Step 2: Run AI analysis using PUBLIC URL (not local file://)
    onStatusChange?.('Analyzing your gait...', 30);
    
    let analysisResult: GaitAnalysisResult;
    
    try {
      onStatusChange?.('AI processing video...', 50);
      
      // CRITICAL: Use the public HTTPS URL, not the local file:// URI
      // Claude cannot access local files on the device
      if (publicVideoUrl && publicVideoUrl.startsWith('http')) {
        console.log('[VideoAnalysis] ✅ Using public URL for AI analysis:', publicVideoUrl);
        analysisResult = await analyzeGait(
          { videoUrl: publicVideoUrl, metadata },
          { isAuthenticated: true }
        );
      } else {
        // Fallback: try with local file (will use base64 for small files)
        console.log('[VideoAnalysis] ⚠️ No public URL, using local file (may fail for large files)');
        analysisResult = await aiAnalyzeVideo(videoUri, metadata, { isAuthenticated: true });
      }
      
      onStatusChange?.('Generating insights...', 80);
    } catch (error) {
      console.error('[VideoAnalysis] ❌ AI analysis error:', error);
      throw error; // Don't fall back to demo for authenticated users
    }

    // Step 3: Update database with results
    onStatusChange?.('Saving results...', 90);
    
    if (analysisId !== 'demo') {
      await updateAnalysisResults(analysisId, {
        gait_score: analysisResult.gait_score,
        foot_strike: analysisResult.foot_strike,
        stride_length: analysisResult.stride_length,
        cadence: analysisResult.cadence,
        ground_contact_time: analysisResult.ground_contact_time,
        step_width: analysisResult.step_width,
        toe_out_angle: analysisResult.toe_out_angle,
        pelvic_drop: analysisResult.pelvic_drop,
        arm_swing_asymmetry: analysisResult.arm_swing_asymmetry,
        ai_feedback: analysisResult.ai_feedback,
        processing_status: 'completed',
      });
    }

    // Step 4: Return complete analysis
    onStatusChange?.('Analysis complete!', 100);

    // Fetch the updated record or construct from result
    const finalAnalysis = await getGaitAnalysis(analysisId);
    return finalAnalysis || {
      id: analysisId,
      user_id: 'demo',
      gait_score: analysisResult.gait_score,
      foot_strike: analysisResult.foot_strike,
      stride_length: analysisResult.stride_length,
      cadence: analysisResult.cadence,
      ground_contact_time: analysisResult.ground_contact_time,
      step_width: analysisResult.step_width,
      toe_out_angle: analysisResult.toe_out_angle,
      pelvic_drop: analysisResult.pelvic_drop,
      arm_swing_asymmetry: analysisResult.arm_swing_asymmetry,
      ai_feedback: analysisResult.ai_feedback,
      processing_status: 'completed',
      created_at: new Date().toISOString(),
      analyzed_at: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('[VideoAnalysis] ❌ Process error:', error);
    // Re-throw with clearer message for authenticated users
    throw new Error(error.message || 'Video analysis failed. Please try again.');
  }
}

/**
 * Quick analysis without upload (for demo/testing)
 */
export async function quickAnalysis(): Promise<GaitAnalysisResult> {
  return analyzeGait({});
}

/**
 * Convert GaitAnalysis to display-friendly format
 */
export function formatAnalysisForDisplay(analysis: GaitAnalysis): {
  score: number;
  metrics: Array<{ label: string; value: string | number; unit?: string }>;
  feedback: FeedbackItem[];
  summary: string;
  recommendations: string[];
} {
  const feedback = parseAiFeedback(analysis.ai_feedback || null);
  
  // Parse summary and recommendations from ai_feedback
  let summary = 'Your gait analysis is complete.';
  let recommendations: string[] = [];
  
  try {
    const parsed = JSON.parse(analysis.ai_feedback || '{}');
    summary = parsed.summary || summary;
    recommendations = parsed.recommendations || [];
  } catch {
    // Use defaults
  }

  return {
    score: analysis.gait_score || 0,
    metrics: [
      { 
        label: 'Foot Strike', 
        value: capitalizeFirst(analysis.foot_strike || 'Unknown'),
      },
      { 
        label: 'Stride Length', 
        value: analysis.stride_length?.toFixed(2) || 'N/A', 
        unit: 'm',
      },
      { 
        label: 'Cadence', 
        value: analysis.cadence || 0, 
        unit: 'SPM',
      },
      { 
        label: 'Ground Contact', 
        value: (analysis.ground_contact_time || 0).toFixed(2), 
        unit: 's',
      },
      { 
        label: 'Step Width', 
        value: (analysis.step_width || 0).toFixed(2), 
        unit: 'm',
      },
      { 
        label: 'Toe Out Angle', 
        value: (analysis.toe_out_angle || 0).toFixed(1), 
        unit: '°',
      },
      { 
        label: 'Pelvic Drop', 
        value: (analysis.pelvic_drop || 0).toFixed(1), 
        unit: '°',
      },
      { 
        label: 'Arm Swing Asymmetry', 
        value: (analysis.arm_swing_asymmetry || 0).toFixed(1), 
        unit: '%',
      },
    ],
    feedback,
    summary,
    recommendations,
  };
}

/**
 * Generate score description
 */
export function getScoreDescription(score: number): {
  label: string;
  description: string;
  color: string;
} {
  if (score >= 90) {
    return {
      label: 'Excellent',
      description: 'Outstanding gait pattern. Keep up the great work!',
      color: '#22C55E', // green
    };
  } else if (score >= 80) {
    return {
      label: 'Great',
      description: 'Strong gait mechanics with minor optimization opportunities.',
      color: '#84CC16', // lime
    };
  } else if (score >= 70) {
    return {
      label: 'Good',
      description: 'Solid foundation with room for improvement.',
      color: '#F26F05', // Arisole orange
    };
  } else if (score >= 60) {
    return {
      label: 'Fair',
      description: 'Some areas need attention. Focus on the recommendations.',
      color: '#F59E0B', // amber
    };
  } else {
    return {
      label: 'Needs Work',
      description: 'Several areas require improvement. Consider professional guidance.',
      color: '#EF4444', // red
    };
  }
}

/**
 * Calculate improvement percentage between analyses
 */
export function calculateImprovement(
  currentScore: number,
  previousScore: number
): { percentage: number; improved: boolean } {
  if (previousScore === 0) {
    return { percentage: 0, improved: true };
  }
  
  const change = currentScore - previousScore;
  const percentage = Math.round((change / previousScore) * 100);
  
  return {
    percentage: Math.abs(percentage),
    improved: change >= 0,
  };
}

// Helper
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
