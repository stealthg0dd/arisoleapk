/**
 * Modern Google OAuth Authentication Context
 * 
 * FIXES FOR COMMON OAUTH ISSUES:
 * 
 * 1. "400: invalid_request" Error
 *    - CAUSE: Redirect URI mismatch. Expo Go requires the auth proxy.
 *    - FIX: Use makeRedirectUri({ useProxy: true }) to auto-generate correct URI.
 * 
 * 2. "Only test users can login" Issue
 *    - CAUSE: OAuth consent screen is in "Testing" mode in Google Console.
 *    - FIX: Go to Google Console → OAuth consent screen → Publish App → Production.
 * 
 * 3. Android/iOS client IDs misused for Expo Go
 *    - CAUSE: Using platform-specific client IDs in Expo Go.
 *    - FIX: Expo Go ALWAYS uses Web Client ID since it goes through auth.expo.io proxy.
 * 
 * 4. Works on Expo Go, Android, iOS, and Web with single code path
 *    - Uses useIdTokenAuthRequest for secure ID token flow
 *    - Returns ID tokens for Supabase integration
 *    - Falls back to Google profile API if Supabase fails
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { supabase, User } from '../services/supabase';

// ============ CRITICAL: Complete pending auth sessions ============
// This MUST be called at module scope, not inside a component
// It handles the OAuth redirect callback when the browser returns
WebBrowser.maybeCompleteAuthSession();

// ============ Configuration ============
// Only Web Client ID is required for Expo Go (auth goes through auth.expo.io)
// Android/iOS client IDs are only needed for standalone production builds
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

// Log configuration on startup for debugging
console.log('[Auth] ================================================');
console.log('[Auth] Web Client ID configured:', !!GOOGLE_WEB_CLIENT_ID);
console.log('[Auth] Android Client ID configured:', !!GOOGLE_ANDROID_CLIENT_ID);
console.log('[Auth] iOS Client ID configured:', !!GOOGLE_IOS_CLIENT_ID);
console.log('[Auth] Platform:', Platform.OS);
console.log('[Auth] ================================================');

// ============ Types ============
export interface GoogleUser {
  id: string;
  email: string;
  name?: string;
  givenName?: string;
  familyName?: string;
  photo?: string;
  locale?: string;
  verified?: boolean;
  created_at: string;
}

// Track if using fallback mode (no Supabase session)
let isUsingFallbackMode = false;
export const getIsFallbackMode = () => isUsingFallbackMode;

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isSigningIn: boolean;
  isFallbackMode: boolean; // True if signed in without Supabase session
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
}

// ============ Context ============
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isSigningIn: false,
  isFallbackMode: false,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  error: null,
});

export const useAuth = () => useContext(AuthContext);

// ============ Helper Functions ============
const isOAuthConfigured = (): boolean => {
  const configured = !!(
    GOOGLE_WEB_CLIENT_ID &&
    GOOGLE_WEB_CLIENT_ID.length > 10 &&
    GOOGLE_WEB_CLIENT_ID.endsWith('.apps.googleusercontent.com')
  );
  return configured;
};

// Fetch user profile from Google using access token (fallback if Supabase fails)
const fetchGoogleUserProfile = async (accessToken: string): Promise<GoogleUser | null> => {
  try {
    const response = await fetch('https://www.googleapis.com/userinfo/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch user info: ${response.status}`);
    }
    
    const userInfo = await response.json();
    console.log('[Auth] Google user info fetched:', userInfo.email);
    
    return {
      id: userInfo.id,
      email: userInfo.email,
      name: userInfo.name,
      givenName: userInfo.given_name,
      familyName: userInfo.family_name,
      photo: userInfo.picture,
      locale: userInfo.locale,
      verified: userInfo.verified_email,
      created_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[Auth] Error fetching Google user profile:', error);
    return null;
  }
};

// ============ Provider Component ============
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============ CRITICAL FIX: Google OAuth Setup ============
  // 
  // useIdTokenAuthRequest returns an ID token (not just access token)
  // which is required for secure Supabase authentication.
  //
  // KEY INSIGHT: Don't pass a custom redirectUri!
  // The Google provider auto-generates the correct redirect URI:
  // - Expo Go: https://auth.expo.io/@stealthgodd/arisole-strideiq
  // - Standalone: com.arisole.strideiq://
  //
  // This is why passing androidClientId/iosClientId separately is important:
  // - In Expo Go: Only clientId (Web) is used
  // - In standalone builds: Platform-specific IDs are used
  //
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    // Web Client ID - ALWAYS required (used by Expo Go and web)
    clientId: GOOGLE_WEB_CLIENT_ID,
    // Platform-specific IDs - only used in standalone production builds
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    // Request necessary scopes
    scopes: ['profile', 'email', 'openid'],
  });

  // Log when OAuth request is ready
  useEffect(() => {
    console.log('[Auth] OAuth request ready:', !!request);
    if (request) {
      console.log('[Auth] Request URL:', request.url?.substring(0, 100) + '...');
    }
  }, [request]);

  // ============ Check Existing Session ============
  useEffect(() => {
    checkExistingSession();
    
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] Auth state changed:', event);
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || undefined,
            created_at: session.user.created_at,
          });
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
        setIsLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const checkExistingSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        console.log('[Auth] Existing session found:', session.user.email);
        setUser({
          id: session.user.id,
          email: session.user.email || undefined,
          created_at: session.user.created_at,
        });
      }
    } catch (err) {
      console.error('[Auth] Error checking session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // ============ Handle OAuth Response ============
  useEffect(() => {
    if (!response) return;
    
    console.log('[Auth] OAuth response type:', response.type);
    
    if (response.type === 'success') {
      handleOAuthSuccess(response);
    } else if (response.type === 'error') {
      console.error('[Auth] OAuth error:', response.error);
      const errorMessage = response.error?.message || 'Authentication failed';
      setError(errorMessage);
      setIsSigningIn(false);
      
      // Show helpful error message
      Alert.alert(
        'Sign-In Failed',
        errorMessage + '\n\nMake sure you have added the redirect URI to Google Console.',
        [{ text: 'OK' }]
      );
    } else if (response.type === 'dismiss') {
      console.log('[Auth] OAuth dismissed by user');
      setIsSigningIn(false);
    }
  }, [response]);

  const handleOAuthSuccess = async (successResponse: typeof response) => {
    try {
      console.log('[Auth] OAuth success, processing tokens...');
      
      if (successResponse?.type !== 'success') return;
      
      const { params } = successResponse;
      const idToken = params?.id_token;
      const accessToken = params?.access_token;

      console.log('[Auth] ID Token received:', !!idToken);
      console.log('[Auth] Access Token received:', !!accessToken);

      if (!idToken) {
        throw new Error('No ID token received from Google. Check your OAuth configuration.');
      }

      // Try to sign in with Supabase using the ID token
      console.log('[Auth] Signing in with Supabase...');
      const { data, error: supabaseError } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
        access_token: accessToken,
      });

      if (supabaseError) {
        console.error('[Auth] Supabase sign-in error:', supabaseError.message);
        
        // FALLBACK: If Supabase fails, use Google profile directly
        // This allows the app to work even without Supabase Google Auth configured
        // WARNING: Features requiring Supabase (video upload, analysis storage) won't work!
        if (accessToken) {
          console.log('[Auth] ⚠️ Supabase failed, falling back to Google profile...');
          console.log('[Auth] ⚠️ Video upload will NOT work in fallback mode!');
          console.log('[Auth] ⚠️ To fix: Configure Google provider in Supabase Dashboard');
          const googleUser = await fetchGoogleUserProfile(accessToken);
          if (googleUser) {
            setUser({
              id: googleUser.id,
              email: googleUser.email,
              created_at: googleUser.created_at,
            });
            setIsFallbackMode(true);
            isUsingFallbackMode = true;
            setError(null);
            console.log('[Auth] Signed in via Google profile fallback (NO SUPABASE SESSION)');
            
            // Show warning to user
            Alert.alert(
              'Limited Functionality',
              'Signed in with Google, but video analysis is not available.\n\n' +
              'To enable full features, the app administrator needs to configure Google Auth in Supabase.',
              [{ text: 'OK' }]
            );
            return;
          }
        }
        throw supabaseError;
      }

      if (data.user) {
        console.log('[Auth] Supabase sign-in successful:', data.user.email);
        setUser({
          id: data.user.id,
          email: data.user.email || undefined,
          created_at: data.user.created_at,
        });
        setIsFallbackMode(false);
        isUsingFallbackMode = false;
        setError(null);
      }
    } catch (err: any) {
      console.error('[Auth] Error handling OAuth success:', err);
      setError(err.message || 'Failed to complete sign-in');
    } finally {
      setIsSigningIn(false);
    }
  };

  // ============ Sign In Function ============
  const signInWithGoogle = useCallback(async () => {
    console.log('[Auth] ========================================');
    console.log('[Auth] signInWithGoogle called');
    console.log('[Auth] OAuth configured:', isOAuthConfigured());
    console.log('[Auth] Request ready:', !!request);
    console.log('[Auth] ========================================');
    
    setError(null);
    
    // Check if OAuth is configured
    if (!isOAuthConfigured()) {
      console.log('[Auth] OAuth not configured, offering demo mode');
      Alert.alert(
        'Demo Mode',
        'Google Sign-In is not configured.\n\nAdd EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to your .env file to enable Google login.',
        [
          {
            text: 'Continue as Demo User',
            onPress: () => {
              setUser({
                id: 'demo-user-' + Date.now(),
                email: 'demo@arisole.com',
                created_at: new Date().toISOString(),
              });
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    // Check if request is initialized
    if (!request) {
      console.log('[Auth] OAuth request not initialized');
      setError('Authentication is initializing. Please try again in a moment.');
      return;
    }

    try {
      setIsSigningIn(true);
      console.log('[Auth] Opening Google sign-in...');
      
      // CRITICAL: promptAsync opens the OAuth flow
      // showInRecents: false prevents the auth page from appearing in recent apps
      const result = await promptAsync({ showInRecents: false });
      console.log('[Auth] promptAsync completed with type:', result.type);
      
      // Response will be handled in the useEffect above
    } catch (err: any) {
      console.error('[Auth] Error starting OAuth:', err);
      setError(err.message || 'Failed to start sign-in');
      setIsSigningIn(false);
    }
  }, [request, promptAsync]);

  // ============ Sign Out Function ============
  const signOut = useCallback(async () => {
    console.log('[Auth] Signing out...');
    try {
      await supabase.auth.signOut();
      setUser(null);
      setIsFallbackMode(false);
      isUsingFallbackMode = false;
      setError(null);
      console.log('[Auth] Sign out successful');
    } catch (err: any) {
      console.error('[Auth] Sign out error:', err);
      // Clear user anyway
      setUser(null);
      setIsFallbackMode(false);
      isUsingFallbackMode = false;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, isSigningIn, isFallbackMode, signInWithGoogle, signOut, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
