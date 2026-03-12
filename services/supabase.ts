import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as FileSystem from 'expo-file-system/legacy';

// FileSystem upload type constants
const FileSystemUploadType = {
  BINARY_CONTENT: 0,
  MULTIPART: 1,
} as const;

// Supabase configuration - MUST be set in .env file
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Validate configuration
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[Supabase] ❌ Missing configuration. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file');
}

// Create Supabase client
export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co', 
  SUPABASE_ANON_KEY || 'placeholder-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

// =====================================================
// SESSION CHECK UTILITY - For debugging auth issues
// =====================================================

/**
 * Check current session status and log details for debugging
 * Returns the session if valid, null otherwise
 */
export const checkSession = async (): Promise<{ valid: boolean; session: any; user: any; error: string | null }> => {
  console.log('🔍 [checkSession] Checking current session status...');
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ [checkSession] Error getting session:', error.message);
      return { valid: false, session: null, user: null, error: error.message };
    }
    
    if (!session) {
      console.warn('⚠️ [checkSession] No active session found');
      return { valid: false, session: null, user: null, error: 'No active session' };
    }
    
    // Check if token is expired
    const expiresAt = session.expires_at;
    const now = Math.floor(Date.now() / 1000);
    const isExpired = expiresAt && expiresAt < now;
    
    if (isExpired) {
      console.warn('⚠️ [checkSession] Session token expired, attempting refresh...');
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !refreshedSession) {
        console.error('❌ [checkSession] Failed to refresh session:', refreshError?.message);
        return { valid: false, session: null, user: null, error: 'Session expired and refresh failed' };
      }
      
      console.log('✅ [checkSession] Session refreshed successfully');
      return { valid: true, session: refreshedSession, user: refreshedSession.user, error: null };
    }
    
    console.log('✅ [checkSession] Valid session found for user:', session.user?.email);
    console.log('   - User ID:', session.user?.id);
    console.log('   - Expires at:', expiresAt ? new Date(expiresAt * 1000).toLocaleString() : 'Unknown');
    console.log('   - Provider:', session.user?.app_metadata?.provider);
    
    return { valid: true, session, user: session.user, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ [checkSession] Unexpected error:', errorMessage);
    return { valid: false, session: null, user: null, error: errorMessage };
  }
};

/**
 * Ensure user is authenticated before performing an action
 * Throws an error with user-friendly message if not authenticated
 */
export const requireAuthentication = async (): Promise<{ userId: string; email: string | undefined; accessToken: string }> => {
  const { valid, session, error } = await checkSession();
  
  if (!valid || !session) {
    throw new Error(`Authentication required: ${error || 'Please sign in to continue'}`);
  }
  
  return {
    userId: session.user.id,
    email: session.user.email,
    accessToken: session.access_token,
  };
};

// =====================================================
// TYPES - Matching your existing Supabase schema
// =====================================================

export interface User {
  id: string;
  email?: string;
  created_at?: string;
}

// Profile from profiles table
export interface Profile {
  id: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  updated_at?: string;
}

// Extended profile from user_profiles table
export interface UserProfile {
  id: string;
  age?: number;
  height?: number;
  weight?: number;
  biological_sex?: string;
  activity_level?: string;
  existing_conditions?: string[];
  is_beta_tester?: boolean;
  created_at?: string;
  referral_code?: string;
  referral_count?: number;
  referred_by?: string;
  user_interests?: any;
  is_premium?: boolean;
  expo_push_token?: string;
  onboarding_goal?: string;
  onboarding_activity_level?: string;
  onboarding_smart_insoles?: string;
}

// Video from videos table
export interface Video {
  id: string;
  user_email?: string;
  video_type?: string;
  surface_type?: string;
  footwear_status?: string;
  pain_level?: number;
  areas_of_concern?: string[];
  recent_activity?: string;
  video_url?: string;
  filename?: string;
  file_size?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  uploaded_at?: string;
  analyzed_at?: string;
  analysis_result?: any;
  created_at?: string;
  updated_at?: string;
}

// Gait Analysis from gait_analyses table
export interface GaitAnalysis {
  id: string;
  user_id: string;
  video_url?: string;
  video_type?: string;
  gait_score?: number;
  foot_strike?: string;
  stride_length?: number;
  cadence?: number;
  ground_contact_time?: number;
  step_width?: number;
  toe_out_angle?: number;
  pelvic_drop?: number;
  arm_swing_asymmetry?: number;
  ai_feedback?: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at?: string;
  analyzed_at?: string;
  original_filename?: string;
  file_size?: number;
  file_type?: string;
}

// Feed Post (new social feature)
export interface FeedPost {
  id: string;
  user_id: string;
  gait_analysis_id?: string;
  caption?: string;
  likes_count: number;
  comments_count: number;
  is_public: boolean;
  created_at: string;
  // Joined data
  profile?: Profile;
  gait_analysis?: GaitAnalysis;
}

// Achievement
export interface Achievement {
  id: string;
  name: string;
  title: string;
  description?: string;
  icon?: string;
  is_gold: boolean;
  requirement_type?: string;
  requirement_value?: number;
}

// User Achievement
export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  achievement?: Achievement;
}

// Feedback item for UI display
export interface FeedbackItem {
  category: string;
  title: string;
  description: string;
  status: 'good' | 'warning' | 'improve';
}

// =====================================================
// VIDEO UPLOAD & ANALYSIS
// =====================================================

// Maximum file size for base64 approach (10MB) - larger files use streaming
const MAX_BASE64_SIZE = 10 * 1024 * 1024;

/**
 * Upload video to Supabase Storage and create analysis record
 * 
 * IMPORTANT: Requires authenticated user for RLS policies.
 * The storage bucket 'videos' must have proper RLS policies configured.
 * 
 * Required Supabase Storage RLS Policies for 'videos' bucket:
 * 
 * 1. INSERT policy (for authenticated users):
 *    - Name: "Allow authenticated uploads"
 *    - Target roles: authenticated
 *    - WITH CHECK: (bucket_id = 'videos' AND auth.uid() IS NOT NULL)
 * 
 * 2. SELECT policy (for reading own files):
 *    - Name: "Allow authenticated reads"
 *    - Target roles: authenticated  
 *    - USING: (bucket_id = 'videos')
 * 
 * 3. For public URLs, enable "Public" on the bucket in Supabase Dashboard
 */
export async function uploadVideo(
  videoUri: string,
  metadata?: {
    video_type?: string;
    surface_type?: string;
    footwear_status?: string;
    pain_level?: number;
    areas_of_concern?: string[];
  },
  options?: { requireAuth?: boolean; userId?: string }
): Promise<{ success: boolean; analysisId?: string; videoUrl?: string; error?: string; isDemo?: boolean }> {
  try {
    console.log('[Upload] ========================================');
    console.log('[Upload] Starting video upload...');
    console.log('[Upload] Video URI:', videoUri.substring(0, 50) + '...');
    console.log('[Upload] Options:', JSON.stringify(options));
    
    // Get current user session with proper error handling
    let user = null;
    let session = null;
    
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.warn('[Upload] ⚠️ Session error:', sessionError.message);
      } else {
        session = sessionData?.session;
        user = session?.user || null;
        console.log('[Upload] Session check:', session ? '✅ Active session' : '❌ No session');
        if (user) {
          console.log('[Upload] Session user ID:', user.id);
          console.log('[Upload] Session user email:', user.email);
        }
      }
    } catch (authError) {
      console.warn('[Upload] ❌ Auth check error:', authError);
    }
    
    // Check authentication requirement
    if (!user) {
      // Log detailed auth state for debugging
      console.error('[Upload] ❌ No Supabase session found!');
      console.error('[Upload] 💡 This can happen if:');
      console.error('[Upload]    1. User signed in with Google but Supabase auth failed');
      console.error('[Upload]    2. Supabase Google Auth is not configured in dashboard');
      console.error('[Upload]    3. Session expired');
      
      if (options?.requireAuth) {
        return { 
          success: false, 
          error: 'No active Supabase session. Please sign out and sign in again. If the problem persists, check that Supabase Google Auth is configured.',
          isDemo: false 
        };
      }
      console.log('[Upload] ⚠️ No authenticated user, using demo mode');
      return { success: true, analysisId: 'demo', isDemo: true };
    }
    
    console.log('[Upload] ✅ User authenticated:', user.email);
    console.log('[Upload] ✅ User ID:', user.id);

    // Generate unique filename with user ID for RLS compliance
    const timestamp = Date.now();
    const filename = `${user.id}/${timestamp}_gait.mp4`;
    
    // Get file info
    const fileInfo = await FileSystem.getInfoAsync(videoUri);
    if (!fileInfo.exists) {
      return { success: false, error: 'Video file not found' };
    }
    
    const fileSize = (fileInfo as any).size || 0;
    console.log(`[Upload] 📦 File size: ${(fileSize / 1024 / 1024).toFixed(2)}MB`);
    
    let uploadSuccess = false;
    let publicUrl = '';
    let uploadError: string | null = null;

    // For large files, use streaming upload via FileSystem.uploadAsync
    if (fileSize > MAX_BASE64_SIZE) {
      console.log('[Upload] Large file detected, using streaming upload...');
      
      try {
        // Get a signed upload URL from Supabase
        const { data: signedData, error: signedError } = await supabase.storage
          .from('videos')
          .createSignedUploadUrl(filename);
        
        if (signedError) {
          console.error('[Upload] ❌ Signed URL error:', signedError.message);
          
          // Check for RLS error
          if (signedError.message.includes('row-level security') || signedError.message.includes('policy')) {
            uploadError = 'Storage access denied. Please check Supabase RLS policies for the videos bucket.';
          } else {
            uploadError = signedError.message;
          }
        } else if (signedData) {
          // Use FileSystem.uploadAsync for streaming (doesn't load entire file in memory)
          const uploadResult = await FileSystem.uploadAsync(
            signedData.signedUrl,
            videoUri,
            {
              httpMethod: 'PUT',
              uploadType: FileSystemUploadType.BINARY_CONTENT,
              headers: {
                'Content-Type': 'video/mp4',
              },
            }
          );

          if (uploadResult.status >= 200 && uploadResult.status < 300) {
            uploadSuccess = true;
            const { data: urlData } = supabase.storage.from('videos').getPublicUrl(filename);
            publicUrl = urlData.publicUrl;
            console.log('[Upload] ✅ Streaming upload successful');
          } else {
            console.error('[Upload] ❌ Streaming upload failed:', uploadResult.status, uploadResult.body);
            uploadError = `Upload failed with status ${uploadResult.status}`;
          }
        }
      } catch (streamError: any) {
        console.error('[Upload] ❌ Streaming upload error:', streamError);
        uploadError = streamError.message || 'Streaming upload failed';
      }
    } else {
      // For small files, use base64 approach (safe for memory)
      console.log('[Upload] Small file, using base64 upload...');
      
      try {
        const base64 = await FileSystem.readAsStringAsync(videoUri, {
          encoding: 'base64',
        });

        const { data: uploadData, error: storageError } = await supabase.storage
          .from('videos')
          .upload(filename, decode(base64), {
            contentType: 'video/mp4',
            upsert: true,
          });

        if (storageError) {
          console.error('[Upload] ❌ Base64 upload error:', storageError.message);
          
          // Parse RLS error for better messaging
          if (storageError.message.includes('row-level security') || 
              storageError.message.includes('policy') ||
              storageError.message.includes('violates')) {
            uploadError = `RLS Error: ${storageError.message}. Please ensure the 'videos' bucket has proper INSERT policies for authenticated users.`;
            console.error('[Upload] 💡 RLS Fix: Add INSERT policy for authenticated users on the videos bucket');
          } else {
            uploadError = storageError.message;
          }
        } else {
          uploadSuccess = true;
          const { data: urlData } = supabase.storage.from('videos').getPublicUrl(filename);
          publicUrl = urlData.publicUrl;
          console.log('[Upload] ✅ Base64 upload successful');
        }
      } catch (base64Error: any) {
        console.error('[Upload] ❌ Base64 read error:', base64Error);
        uploadError = base64Error.message || 'Failed to read video file';
      }
    }

    // Handle upload failure
    if (!uploadSuccess) {
      console.error('[Upload] ❌ Upload failed:', uploadError);
      
      // Return actual error instead of silently falling back to demo
      if (options?.requireAuth || user) {
        return { 
          success: false, 
          error: uploadError || 'Upload failed',
          isDemo: false 
        };
      }
      
      // Only fall back to demo for unauthenticated users
      console.log('[Upload] Using demo mode due to upload failure');
      return { success: true, analysisId: 'demo', isDemo: true };
    }

    // Insert into gait_analyses table
    const { data: analysisRecord, error: dbError } = await supabase
      .from('gait_analyses')
      .insert({
        user_id: user.id,
        video_url: publicUrl,
        video_type: metadata?.video_type || 'walking',
        processing_status: 'processing',
        original_filename: filename,
        file_size: fileSize,
        file_type: 'video/mp4',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      console.error('[Upload] ❌ Database error:', dbError.message);
      
      // Check for RLS error on gait_analyses table
      if (dbError.message.includes('row-level security') || 
          dbError.message.includes('policy') ||
          dbError.message.includes('violates')) {
        return {
          success: false,
          error: `Database RLS Error: ${dbError.message}. Please add INSERT policy for authenticated users on gait_analyses table.`,
          isDemo: false,
        };
      }
      
      return { success: false, error: dbError.message, isDemo: false };
    }

    console.log(`[Upload] ✅ Success! Analysis ID: ${analysisRecord.id}, URL: ${publicUrl}`);
    return { success: true, analysisId: analysisRecord.id, videoUrl: publicUrl, isDemo: false };
  } catch (error: any) {
    console.error('[Upload] ❌ Unexpected error:', error);
    return { success: false, error: error.message || 'Unexpected upload error', isDemo: false };
  }
}

// =====================================================
// GET ANALYSIS
// =====================================================

export async function getGaitAnalysis(analysisId: string): Promise<GaitAnalysis | null> {
  try {
    if (analysisId === 'demo') {
      return getDemoAnalysis();
    }

    const { data, error } = await supabase
      .from('gait_analyses')
      .select('*')
      .eq('id', analysisId)
      .single();

    if (error) {
      console.error('Get analysis error:', error);
      return getDemoAnalysis();
    }

    return data;
  } catch (error) {
    console.error('Get analysis error:', error);
    return getDemoAnalysis();
  }
}

// Get user's analysis history
export async function getUserAnalyses(userId: string): Promise<GaitAnalysis[]> {
  try {
    const { data, error } = await supabase
      .from('gait_analyses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get analyses error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Get analyses error:', error);
    return [];
  }
}

// Update analysis with AI results
export async function updateAnalysisResults(
  analysisId: string,
  results: Partial<GaitAnalysis>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('gait_analyses')
      .update({
        ...results,
        processing_status: 'completed',
        analyzed_at: new Date().toISOString(),
      })
      .eq('id', analysisId);

    if (error) {
      console.error('Update analysis error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Update analysis error:', error);
    return false;
  }
}

// =====================================================
// PROFILE FUNCTIONS
// =====================================================

export async function getProfile(userId: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Get profile error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Get profile error:', error);
    return null;
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Get user profile error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Get user profile error:', error);
    return null;
  }
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId);

    if (error) {
      console.error('Update profile error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Update profile error:', error);
    return false;
  }
}

// =====================================================
// SOCIAL FEED FUNCTIONS
// =====================================================

export async function getFeedPosts(limit: number = 20): Promise<FeedPost[]> {
  try {
    const { data, error } = await supabase
      .from('feed_posts')
      .select(`
        *,
        profile:profiles(*),
        gait_analysis:gait_analyses(*)
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Get feed error:', error);
      return getDemoFeedPosts();
    }

    return data || getDemoFeedPosts();
  } catch (error) {
    console.error('Get feed error:', error);
    return getDemoFeedPosts();
  }
}

export async function createFeedPost(
  gaitAnalysisId: string,
  caption?: string
): Promise<FeedPost | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('feed_posts')
      .insert({
        user_id: user.id,
        gait_analysis_id: gaitAnalysisId,
        caption,
        is_public: true,
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Create post error:', error);
    return null;
  }
}

export async function likePost(postId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return false;

    const { error } = await supabase
      .from('post_likes')
      .insert({
        post_id: postId,
        user_id: user.id,
      });

    return !error;
  } catch (error) {
    console.error('Like post error:', error);
    return false;
  }
}

export async function unlikePost(postId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return false;

    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', user.id);

    return !error;
  } catch (error) {
    console.error('Unlike post error:', error);
    return false;
  }
}

// =====================================================
// ACHIEVEMENTS FUNCTIONS
// =====================================================

export async function getAchievements(): Promise<Achievement[]> {
  try {
    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .order('is_gold', { ascending: false });

    if (error) {
      console.error('Get achievements error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Get achievements error:', error);
    return [];
  }
}

export async function getUserAchievements(userId: string): Promise<UserAchievement[]> {
  try {
    const { data, error } = await supabase
      .from('user_achievements')
      .select(`
        *,
        achievement:achievements(*)
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('Get user achievements error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Get user achievements error:', error);
    return [];
  }
}

// =====================================================
// USER STATS
// =====================================================

export async function getUserStats(userId: string) {
  try {
    // Get total analyses
    const { count: analysisCount } = await supabase
      .from('gait_analyses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('processing_status', 'completed');

    // Get average score
    const { data: analyses } = await supabase
      .from('gait_analyses')
      .select('gait_score')
      .eq('user_id', userId)
      .eq('processing_status', 'completed')
      .not('gait_score', 'is', null);

    const avgScore = analyses?.length
      ? Math.round(analyses.reduce((sum, a) => sum + (a.gait_score || 0), 0) / analyses.length)
      : 0;

    // Get achievements count
    const { count: achievementsCount } = await supabase
      .from('user_achievements')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    return {
      totalAnalyses: analysisCount || 0,
      avgGaitScore: avgScore,
      achievementsUnlocked: achievementsCount || 0,
    };
  } catch (error) {
    console.error('Get user stats error:', error);
    return {
      totalAnalyses: 0,
      avgGaitScore: 0,
      achievementsUnlocked: 0,
    };
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Demo data for testing without backend
function getDemoAnalysis(): GaitAnalysis {
  return {
    id: 'demo-analysis',
    user_id: 'demo',
    video_url: '',
    video_type: 'walking',
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
      summary: 'Good overall gait pattern with room for improvement in impact control.',
      recommendations: [
        'Focus on softer landings to reduce impact force',
        'Maintain current cadence - it\'s optimal',
        'Work on arm swing symmetry',
      ],
    }),
    processing_status: 'completed',
    created_at: new Date().toISOString(),
    analyzed_at: new Date().toISOString(),
  };
}

function getDemoFeedPosts(): FeedPost[] {
  return [
    {
      id: 'demo-post-1',
      user_id: 'demo-user-1',
      gait_analysis_id: 'demo-analysis-1',
      caption: 'My best stride yet! 💪',
      likes_count: 24,
      comments_count: 5,
      is_public: true,
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      profile: {
        id: 'demo-user-1',
        username: 'sarah_m',
        full_name: 'Sarah M.',
        avatar_url: undefined,
      },
      gait_analysis: {
        id: 'demo-analysis-1',
        user_id: 'demo-user-1',
        gait_score: 92,
        foot_strike: 'midfoot',
        cadence: 112,
        stride_length: 1.25,
        processing_status: 'completed',
      },
    },
    {
      id: 'demo-post-2',
      user_id: 'demo-user-2',
      gait_analysis_id: 'demo-analysis-2',
      caption: 'Working on my form every day 🏃‍♂️',
      likes_count: 18,
      comments_count: 3,
      is_public: true,
      created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      profile: {
        id: 'demo-user-2',
        username: 'mike_t',
        full_name: 'Mike T.',
        avatar_url: undefined,
      },
      gait_analysis: {
        id: 'demo-analysis-2',
        user_id: 'demo-user-2',
        gait_score: 88,
        foot_strike: 'heel',
        cadence: 105,
        stride_length: 1.18,
        processing_status: 'completed',
      },
    },
  ];
}

// Parse AI feedback from string to structured format
export function parseAiFeedback(aiFeedback: string | null): FeedbackItem[] {
  if (!aiFeedback) {
    return getDefaultFeedback();
  }

  try {
    const parsed = JSON.parse(aiFeedback);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    
    // If it's an object with recommendations
    if (parsed.recommendations) {
      return parsed.recommendations.map((rec: string, index: number) => ({
        category: `recommendation_${index}`,
        title: 'AI Recommendation',
        description: rec,
        status: 'improve' as const,
      }));
    }
    
    return getDefaultFeedback();
  } catch {
    return getDefaultFeedback();
  }
}

function getDefaultFeedback(): FeedbackItem[] {
  return [
    {
      category: 'heel_strike',
      title: 'Heel Strike Pattern',
      description: 'Your heel contact is well-controlled with minimal overstriding.',
      status: 'good',
    },
    {
      category: 'impact',
      title: 'Impact Force',
      description: 'Moderate impact detected. Consider softer landings.',
      status: 'warning',
    },
    {
      category: 'posture',
      title: 'Posture Alignment',
      description: 'Slight forward lean detected. Keep torso upright.',
      status: 'improve',
    },
    {
      category: 'cadence',
      title: 'Cadence',
      description: 'Good step frequency. Optimal for injury prevention.',
      status: 'good',
    },
  ];
}

// =====================================================
// VIDEO STORAGE HELPER FUNCTIONS
// =====================================================

/**
 * Fetch list of user's uploaded video filenames
 */
export async function fetchUserVideos(userId: string): Promise<string[]> {
  try {
    console.log('[Supabase] Fetching user videos for:', userId);
    
    const { data, error } = await supabase.storage
      .from('videos')
      .list(userId, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) {
      console.error('[Supabase] ❌ Fetch user videos error:', error.message);
      return [];
    }

    const videoFiles = data
      ?.filter(file => file.name.endsWith('.mp4') || file.name.endsWith('.mov'))
      ?.map(file => `${userId}/${file.name}`) || [];
    
    console.log(`[Supabase] ✅ Found ${videoFiles.length} videos`);
    return videoFiles;
  } catch (error) {
    console.error('[Supabase] ❌ Fetch user videos exception:', error);
    return [];
  }
}

/**
 * Get public URL for a video file path
 */
export function getVideoUrl(filePath: string): string {
  const { data } = supabase.storage.from('videos').getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Fetch latest analysis for a user (convenience wrapper)
 */
export async function fetchLatestAnalysis(userId: string): Promise<GaitAnalysis | null> {
  try {
    console.log('[Supabase] Fetching latest analysis for:', userId);
    
    const analyses = await getUserAnalyses(userId);
    
    if (analyses && analyses.length > 0) {
      console.log('[Supabase] ✅ Latest analysis found:', analyses[0].id);
      return analyses[0];
    }
    
    console.log('[Supabase] No analyses found for user');
    return null;
  } catch (error) {
    console.error('[Supabase] ❌ Fetch latest analysis error:', error);
    return null;
  }
}
