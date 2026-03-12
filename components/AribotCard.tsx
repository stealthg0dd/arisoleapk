/**
 * AribotCard.tsx - Dashboard Aribot Chat Preview Card
 * 
 * Light-themed card showing Aribot chat preview.
 * Clicking navigates to the full Aribot chat screen (chat tab).
 * 
 * Features:
 * - Animated avatar preview
 * - Quick action suggestions
 * - Light theme with cyan accent
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedRN, { FadeInUp } from 'react-native-reanimated';

interface AribotCardProps {
  onPress: () => void;
}

// Mini avatar component with subtle animation
function MiniAvatar() {
  const pulseAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={miniAvatarStyles.container}>
      <Animated.View
        style={[
          miniAvatarStyles.glowRing,
          { transform: [{ scale: pulseAnim }] },
        ]}
      />
      <LinearGradient
        colors={['#00CED1', '#20B2AA', '#008B8B']}
        style={miniAvatarStyles.avatar}
      >
        <Ionicons name="sparkles" size={24} color="#fff" />
      </LinearGradient>
    </View>
  );
}

const miniAvatarStyles = StyleSheet.create({
  container: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 206, 209, 0.2)',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00CED1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
});

const AribotCard: React.FC<AribotCardProps> = ({ onPress }) => {
  const quickPrompts = [
    'Explain my score',
    'Exercise tips',
    'Injury prevention',
  ];

  return (
    <AnimatedRN.View entering={FadeInUp.delay(200).duration(500)}>
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.9}
      >
        {/* Header */}
        <View style={styles.header}>
          <MiniAvatar />
          <View style={styles.headerText}>
            <Text style={styles.title}>Chat with Aribot</Text>
            <Text style={styles.subtitle}>AI Fitness Assistant</Text>
          </View>
          <View style={styles.onlineBadge}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Online</Text>
          </View>
        </View>

        {/* Chat Preview */}
        <View style={styles.chatPreview}>
          <View style={styles.previewBubble}>
            <Text style={styles.previewText}>
              👋 Hi! I'm Aribot, your AI fitness assistant. Ask me about your
              gait analysis, exercises, or injury prevention tips!
            </Text>
          </View>
        </View>

        {/* Quick Prompts */}
        <View style={styles.quickPrompts}>
          {quickPrompts.map((prompt, index) => (
            <TouchableOpacity
              key={index}
              style={styles.promptChip}
              onPress={onPress}
            >
              <Text style={styles.promptText}>{prompt}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Call to Action */}
        <View style={styles.ctaContainer}>
          <View style={styles.inputPreview}>
            <Ionicons name="chatbubble-ellipses" size={18} color="#00CED1" />
            <Text style={styles.inputPlaceholder}>Ask Aribot anything...</Text>
            <View style={styles.sendButton}>
              <Ionicons name="send" size={16} color="#fff" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </AnimatedRN.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 206, 209, 0.15)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
    marginRight: 6,
  },
  onlineText: {
    fontSize: 12,
    color: '#22C55E',
    fontWeight: '500',
  },
  chatPreview: {
    marginTop: 16,
    marginBottom: 12,
  },
  previewBubble: {
    backgroundColor: '#F0FDFA',
    borderRadius: 16,
    borderTopLeftRadius: 4,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#00CED1',
  },
  previewText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  quickPrompts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  promptChip: {
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  promptText: {
    fontSize: 13,
    color: '#0891B2',
    fontWeight: '500',
  },
  ctaContainer: {
    marginTop: 4,
  },
  inputPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FFFE',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#00CED1',
  },
  inputPlaceholder: {
    flex: 1,
    fontSize: 14,
    color: '#9CA3AF',
    marginLeft: 10,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00CED1',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AribotCard;
