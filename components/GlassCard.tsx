import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
  intensity?: number;
  dark?: boolean;
}

export default function GlassCard({ 
  children, 
  className = '', 
  style,
  intensity = 80,
  dark = false,
}: GlassCardProps) {
  return (
    <View 
      className={`overflow-hidden rounded-card ${className}`}
      style={[
        styles.container,
        dark ? styles.darkContainer : styles.lightContainer,
        style
      ]}
    >
      <BlurView 
        intensity={intensity} 
        tint={dark ? "dark" : "light"}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  lightContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  darkContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  content: {
    zIndex: 1,
  },
});
