/**
 * AnalysisCard.tsx - Dashboard Analysis Summary Card
 * 
 * Light-themed card showing latest gait analysis results.
 * Clicking navigates to the instruction/video recording flow.
 * 
 * Fetches latest analysis from Supabase for authenticated users.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useAuth } from '../context/AuthContext';
import { getUserAnalyses, GaitAnalysis } from '../services/supabase';

interface AnalysisCardProps {
  onPress: () => void;
}

const AnalysisCard: React.FC<AnalysisCardProps> = ({ onPress }) => {
  const { user } = useAuth();
  const [latestAnalysis, setLatestAnalysis] = useState<GaitAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch latest analysis from Supabase
  useEffect(() => {
    const fetchLatestAnalysis = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        // getUserAnalyses fetches all analyses, we take the first (most recent)
        const analyses = await getUserAnalyses(user.id);
        if (analyses && analyses.length > 0) {
          setLatestAnalysis(analyses[0]);
        }
      } catch (error) {
        console.error('[AnalysisCard] Error fetching analysis:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLatestAnalysis();
  }, [user?.id]);

  // Determine score color based on value
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#22C55E'; // Green
    if (score >= 60) return '#F59E0B'; // Amber
    return '#EF4444'; // Red
  };

  const score = latestAnalysis?.gait_score ?? null;

  return (
    <Animated.View entering={FadeInUp.delay(100).duration(500)}>
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.9}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="analytics" size={24} color="#F26F05" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Gait Analysis</Text>
            <Text style={styles.subtitle}>
              {latestAnalysis ? 'Latest Results' : 'Start Your Journey'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#999" />
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#F26F05" />
          </View>
        ) : latestAnalysis ? (
          <View style={styles.analysisContent}>
            {/* Score Display */}
            <View style={styles.scoreContainer}>
              <Text
                style={[
                  styles.scoreValue,
                  { color: getScoreColor(score || 0) },
                ]}
              >
                {score ?? '--'}
              </Text>
              <Text style={styles.scoreLabel}>Gait Score</Text>
            </View>

            {/* Quick Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="footsteps" size={16} color="#666" />
                <Text style={styles.statValue}>
                  {latestAnalysis.foot_strike || 'N/A'}
                </Text>
                <Text style={styles.statLabel}>Strike</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Ionicons name="speedometer" size={16} color="#666" />
                <Text style={styles.statValue}>
                  {latestAnalysis.cadence ?? '--'}
                </Text>
                <Text style={styles.statLabel}>Cadence</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Ionicons name="resize" size={16} color="#666" />
                <Text style={styles.statValue}>
                  {latestAnalysis.stride_length?.toFixed(1) ?? '--'}m
                </Text>
                <Text style={styles.statLabel}>Stride</Text>
              </View>
            </View>

            {/* Call to Action */}
            <View style={styles.ctaContainer}>
              <LinearGradient
                colors={['#F26F05', '#FF8A33']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaButton}
              >
                <Ionicons name="videocam" size={18} color="#fff" />
                <Text style={styles.ctaText}>Record New Analysis</Text>
              </LinearGradient>
            </View>
          </View>
        ) : (
          <View style={styles.emptyContent}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="walk-outline" size={48} color="#ccc" />
            </View>
            <Text style={styles.emptyTitle}>No Analysis Yet</Text>
            <Text style={styles.emptyText}>
              Record a video of your walk or run to get AI-powered gait analysis
            </Text>
            <View style={styles.ctaContainer}>
              <LinearGradient
                colors={['#F26F05', '#FF8A33']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaButton}
              >
                <Ionicons name="play-circle" size={18} color="#fff" />
                <Text style={styles.ctaText}>Get Started</Text>
              </LinearGradient>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
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
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(242, 111, 5, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
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
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  analysisContent: {
    marginTop: 4,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreValue: {
    fontSize: 56,
    fontWeight: '800',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
  },
  ctaContainer: {
    marginTop: 8,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  ctaText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
});

export default AnalysisCard;
