/**
 * GoogleLoginButton Component
 * 
 * A reusable button component for Google Sign-In.
 * Uses the AuthContext for authentication logic.
 * 
 * Usage:
 * ```tsx
 * import { GoogleLoginButton } from '../components/GoogleLoginButton';
 * 
 * <GoogleLoginButton />
 * // or with custom styling
 * <GoogleLoginButton style={{ marginTop: 20 }} />
 * ```
 */

import React from 'react';
import {
  Pressable,
  Text,
  View,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

interface GoogleLoginButtonProps {
  style?: ViewStyle;
  onLoginSuccess?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
}

export function GoogleLoginButton({ 
  style, 
  onLoginSuccess,
  variant = 'primary' 
}: GoogleLoginButtonProps) {
  const { user, isSigningIn, signInWithGoogle, signOut, error } = useAuth();

  const handlePress = async () => {
    if (user) {
      // User is logged in, sign out
      await signOut();
    } else {
      // User is not logged in, sign in
      await signInWithGoogle();
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    }
  };

  // If user is signed in, show profile button
  if (user) {
    return (
      <Pressable 
        style={[styles.button, styles.signedInButton, style]}
        onPress={handlePress}
        disabled={isSigningIn}
      >
        <View style={styles.userInfo}>
          <Ionicons name="person-circle" size={24} color="#4285F4" />
          <View style={styles.userTextContainer}>
            <Text style={styles.userEmail} numberOfLines={1}>
              {user.email}
            </Text>
            <Text style={styles.tapToSignOut}>Tap to sign out</Text>
          </View>
        </View>
      </Pressable>
    );
  }

  // Sign in button
  const buttonStyles = [
    styles.button,
    variant === 'primary' && styles.primaryButton,
    variant === 'secondary' && styles.secondaryButton,
    variant === 'outline' && styles.outlineButton,
    isSigningIn && styles.disabledButton,
    style,
  ].filter(Boolean);

  const textStyles = [
    styles.buttonText,
    variant === 'outline' && styles.outlineButtonText,
  ].filter(Boolean);

  return (
    <View>
      <Pressable
        style={buttonStyles}
        onPress={handlePress}
        disabled={isSigningIn}
      >
        {isSigningIn ? (
          <ActivityIndicator color={variant === 'outline' ? '#4285F4' : 'white'} />
        ) : (
          <>
            {/* Google "G" Logo */}
            <View style={styles.googleLogoContainer}>
              <Text style={styles.googleLogo}>G</Text>
            </View>
            <Text style={textStyles}>
              Sign in with Google
            </Text>
          </>
        )}
      </Pressable>
      
      {/* Error message */}
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    minHeight: 52,
  },
  primaryButton: {
    backgroundColor: '#4285F4', // Google Blue
  },
  secondaryButton: {
    backgroundColor: '#F26F05', // Arisole Orange
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#4285F4',
  },
  disabledButton: {
    opacity: 0.7,
  },
  signedInButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
  },
  googleLogoContainer: {
    width: 24,
    height: 24,
    backgroundColor: 'white',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  googleLogo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4285F4',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  outlineButtonText: {
    color: '#4285F4',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  userEmail: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  tapToSignOut: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default GoogleLoginButton;
