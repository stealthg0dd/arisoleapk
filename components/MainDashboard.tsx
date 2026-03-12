/**
 * MainDashboard.tsx - Primary Dashboard with Analysis + Aribot Cards
 * 
 * =====================================================
 * MAIN LANDING PAGE FOR ARISOLE STRIDEIQ
 * =====================================================
 * 
 * Light-themed dashboard featuring:
 * - User greeting header
 * - Analysis summary card (navigates to video recording)
 * - Aribot chat card (navigates to chat tab)
 * - Quick stats section
 * 
 * This component orchestrates navigation to:
 * - /recording - For new video analysis
 * - /(tabs)/chat - For Aribot chat
 * 
 * API Integration:
 * - Fetches user data from AuthContext
 * - Analysis card fetches from Supabase (handled in AnalysisCard)
 * - Chat uses Anthropic Claude (handled in chat tab)
 * 
 * @author Arisole StrideIQ Team
 * @version 4.0.0
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';

// Components
import AnalysisCard from './AnalysisCard';
import AribotCard from './AribotCard';
import PreAnalysisInputCard from './PreAnalysisInputCard';
import { useAuth } from '../context/AuthContext';

const MainDashboard: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = React.useState(false);

  // Get user display name
  const userName = user?.email?.split('@')[0] || 'Champion';
  const greeting = getGreeting();

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  // Handle refresh
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Trigger a re-render to refresh data
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  // Navigation handlers
  const handleAnalysisPress = () => {
    // Navigate to recording instruction screen
    // This starts the video recording flow
    router.push('/recording');
  };

  const handleAribotPress = () => {
    // Navigate to chat tab for full Aribot experience
    router.push('/(tabs)/chat');
  };

  const handleNotificationPress = () => {
    // TODO: Navigate to notifications screen
    console.log('Notifications pressed');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#F26F05"
            colors={['#F26F05']}
          />
        }
      >
        {/* Header */}
        <Animated.View
          entering={FadeInDown.duration(500)}
          style={styles.header}
        >
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.userName}>{userName}</Text>
          </View>
          <Pressable
            style={styles.notificationButton}
            onPress={handleNotificationPress}
          >
            <Ionicons name="notifications-outline" size={24} color="#1A1A1A" />
            {/* Notification badge */}
            <View style={styles.notificationBadge} />
          </Pressable>
        </Animated.View>

        {/* Hero Section */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(500)}
          style={styles.heroSection}
        >
          <View style={styles.heroIconContainer}>
            <Ionicons name="fitness" size={32} color="#F26F05" />
          </View>
          <Text style={styles.heroTitle}>StrideIQ</Text>
          <Text style={styles.heroSubtitle}>
            AI-powered gait analysis for better movement
          </Text>
        </Animated.View>

        {/* Pre-Analysis Focus Input */}
        <View style={styles.cardContainer}>
          <PreAnalysisInputCard compact />
        </View>

        {/* Analysis Card */}
        <View style={styles.cardContainer}>
          <AnalysisCard onPress={handleAnalysisPress} />
        </View>

        {/* Aribot Card */}
        <View style={styles.cardContainer}>
          <AribotCard onPress={handleAribotPress} />
        </View>

        {/* Quick Tips Section */}
        <Animated.View
          entering={FadeInDown.delay(300).duration(500)}
          style={styles.tipsSection}
        >
          <Text style={styles.sectionTitle}>Quick Tips</Text>
          <View style={styles.tipsGrid}>
            <TipCard
              icon="footsteps"
              title="Proper Stride"
              description="Keep your stride length natural"
            />
            <TipCard
              icon="body"
              title="Posture"
              description="Maintain upright posture"
            />
            <TipCard
              icon="heart"
              title="Cadence"
              description="Aim for 170-180 steps/min"
            />
            <TipCard
              icon="shield-checkmark"
              title="Recovery"
              description="Rest between sessions"
            />
          </View>
        </Animated.View>

        {/* Bottom Padding for Tab Bar */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

// Tip Card Component
interface TipCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

function TipCard({ icon, title, description }: TipCardProps) {
  return (
    <View style={styles.tipCard}>
      <View style={styles.tipIconContainer}>
        <Ionicons name={icon} size={20} color="#F26F05" />
      </View>
      <Text style={styles.tipTitle}>{title}</Text>
      <Text style={styles.tipDescription}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  userName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A1A1A',
    marginTop: 2,
  },
  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  notificationBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  heroIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(242, 111, 5, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
  },
  cardContainer: {
    marginBottom: 16,
  },
  tipsSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  tipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tipCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  tipIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(242, 111, 5, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  tipDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  bottomPadding: {
    height: 100,
  },
});

export default MainDashboard;
