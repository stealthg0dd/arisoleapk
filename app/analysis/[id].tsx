import { View, Text, ScrollView, Pressable, Dimensions, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect } from 'react';
import Animated, { 
  FadeIn, 
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  useSharedValue,
  withSequence,
  Easing,
  interpolate,
  withDelay,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop, Path, Line } from 'react-native-svg';
import { useAuth } from '../../context/AuthContext';
import { getGaitAnalysis, GaitAnalysis, parseAiFeedback, FeedbackItem as FeedbackItemData } from '../../services/supabase';

const { width } = Dimensions.get('window');
const GAUGE_SIZE = (width - 80) / 2;

interface NeonGaugeProps {
  value: number;
  maxValue: number;
  label: string;
  unit?: string;
  delay: number;
}

function NeonGauge({ value, maxValue, label, unit = '', delay }: NeonGaugeProps) {
  const progress = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(value / maxValue, { duration: 1500, easing: Easing.out(Easing.cubic) })
    );
    
    glow.value = withDelay(
      delay + 500,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1000 }),
          withTiming(0.5, { duration: 1000 })
        ),
        -1,
        true
      )
    );
  }, [value, maxValue]);

  const strokeWidth = 8;
  const radius = (GAUGE_SIZE - strokeWidth * 2) / 2;
  const circumference = Math.PI * radius; // Half circle
  
  const animatedProgress = useAnimatedStyle(() => {
    const strokeDashoffset = circumference * (1 - progress.value);
    return {
      opacity: glow.value,
    };
  });

  return (
    <Animated.View 
      entering={FadeInUp.delay(delay).duration(800)}
      style={{ width: GAUGE_SIZE, alignItems: 'center' }}
    >
      <View style={{ width: GAUGE_SIZE, height: GAUGE_SIZE / 2 + 30, alignItems: 'center' }}>
        <Svg width={GAUGE_SIZE} height={GAUGE_SIZE / 2 + 20}>
          <Defs>
            <SvgLinearGradient id="neonGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#F26F05" />
              <Stop offset="50%" stopColor="#FF6B00" />
              <Stop offset="100%" stopColor="#FFCBA4" />
            </SvgLinearGradient>
          </Defs>
          
          {/* Background Arc */}
          <Path
            d={`M ${strokeWidth} ${GAUGE_SIZE / 2} A ${radius} ${radius} 0 0 1 ${GAUGE_SIZE - strokeWidth} ${GAUGE_SIZE / 2}`}
            stroke="rgba(255, 107, 0, 0.2)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
          />
          
          {/* Progress Arc */}
          <Path
            d={`M ${strokeWidth} ${GAUGE_SIZE / 2} A ${radius} ${radius} 0 0 1 ${GAUGE_SIZE - strokeWidth} ${GAUGE_SIZE / 2}`}
            stroke="url(#neonGradient)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={circumference * (1 - value / maxValue)}
          />
        </Svg>
        
        {/* Value Display */}
        <View style={{ position: 'absolute', bottom: 0, alignItems: 'center' }}>
          <Text className="text-neon-orange text-3xl font-bold">{value}</Text>
          <Text className="text-white/40 text-xs">{unit}</Text>
        </View>
      </View>
      
      <Text className="text-white/70 text-sm font-medium mt-2">{label}</Text>
    </Animated.View>
  );
}

interface FeedbackItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  status: 'good' | 'warning' | 'improve';
  delay: number;
}

function FeedbackItem({ icon, title, description, status, delay }: FeedbackItemProps) {
  const statusColors = {
    good: { bg: 'bg-green-500/20', text: 'text-green-400', icon: '#22C55E' },
    warning: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: '#EAB308' },
    improve: { bg: 'bg-orange-500/20', text: 'text-arisole-orange', icon: '#F26F05' },
  };

  const colors = statusColors[status];

  return (
    <Animated.View 
      entering={FadeInUp.delay(delay).duration(600)}
      className="mb-4"
    >
      <View className="bg-terminal-surface/80 rounded-2xl p-4 border border-white/5">
        <View className="flex-row items-start">
          <View className={`w-10 h-10 rounded-xl ${colors.bg} items-center justify-center mr-3`}>
            <Ionicons name={icon} size={20} color={colors.icon} />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center justify-between">
              <Text className="text-white font-semibold">{title}</Text>
              <View className={`px-2 py-1 rounded-full ${colors.bg}`}>
                <Text className={`text-xs font-medium ${colors.text}`}>
                  {status === 'good' ? 'Good' : status === 'warning' ? 'Caution' : 'Improve'}
                </Text>
              </View>
            </View>
            <Text className="text-white/50 text-sm mt-1">{description}</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

export default function AnalysisScreen() {
  const { id, analysisData: analysisDataParam } = useLocalSearchParams<{ id: string; analysisData?: string }>();
  const router = useRouter();
  const { user, signInWithGoogle } = useAuth();
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [analysis, setAnalysis] = useState<GaitAnalysis | null>(null);
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItemData[]>([]);
  const [error, setError] = useState<string | null>(null);

  const scanLinePosition = useSharedValue(0);

  useEffect(() => {
    // Animate scan line
    scanLinePosition.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.linear }),
      -1,
      false
    );

    loadAnalysis();
  }, [id, analysisDataParam]);

  const loadAnalysis = async () => {
    try {
      setIsAnalyzing(true);
      
      // First try to use passed params (for fresh analysis)
      if (analysisDataParam) {
        try {
          const parsed = JSON.parse(analysisDataParam);
          console.log('[Analysis] Using data from params:', parsed.id);
          setAnalysis(parsed);
          const feedback = parseAiFeedback(parsed.ai_feedback);
          setFeedbackItems(feedback);
          setIsAnalyzing(false);
          setShowResults(true);
          return;
        } catch (e) {
          console.warn('[Analysis] Failed to parse params:', e);
        }
      }

      // If demo mode or no params, use demo data
      if (id === 'demo') {
        console.log('[Analysis] Using demo data');
        setAnalysis({
          id: 'demo',
          user_id: 'demo',
          gait_score: 84,
          foot_strike: 'midfoot',
          stride_length: 1.2,
          cadence: 108,
          ground_contact_time: 0.25,
          step_width: 0.1,
          toe_out_angle: 8.5,
          pelvic_drop: 4.2,
          arm_swing_asymmetry: 5.3,
          processing_status: 'completed',
          ai_feedback: JSON.stringify({
            summary: 'Good overall gait pattern with room for improvement.',
            recommendations: ['Focus on softer landings', 'Maintain current cadence'],
          }),
        });
        setFeedbackItems([
          { category: 'foot_strike', title: 'Foot Strike', description: 'Good midfoot strike pattern.', status: 'good' },
          { category: 'cadence', title: 'Cadence', description: 'Excellent step frequency at 108 SPM.', status: 'good' },
          { category: 'pelvic_drop', title: 'Pelvic Stability', description: 'Minor pelvic drop. Consider hip strengthening.', status: 'warning' },
          { category: 'arm_swing', title: 'Arm Swing', description: 'Slight asymmetry. Work on balanced arm motion.', status: 'improve' },
        ]);
        setTimeout(() => {
          setIsAnalyzing(false);
          setShowResults(true);
        }, 2000);
        return;
      }

      // Fetch from database
      console.log('[Analysis] Fetching from database:', id);
      const data = await getGaitAnalysis(id);
      
      if (data) {
        setAnalysis(data);
        const feedback = parseAiFeedback(data.ai_feedback || null);
        setFeedbackItems(feedback);
        setIsAnalyzing(false);
        setShowResults(true);
      } else {
        setError('Analysis not found');
        setIsAnalyzing(false);
      }
    } catch (err: any) {
      console.error('[Analysis] Error loading:', err);
      setError(err.message || 'Failed to load analysis');
      setIsAnalyzing(false);
    }
  };

  const scanLineStyle = useAnimatedStyle(() => ({
    top: `${scanLinePosition.value * 100}%`,
  }));

  const handleSaveAnalysis = async () => {
    if (!user) {
      await signInWithGoogle();
    } else {
      // Save analysis logic
      router.push('/(tabs)');
    }
  };

  const handlePostToFeed = () => {
    // Post to feed logic
    router.push('/(tabs)/feed');
  };

  // Get icon for feedback category
  const getCategoryIcon = (category: string): keyof typeof Ionicons.glyphMap => {
    const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
      foot_strike: 'footsteps',
      cadence: 'speedometer',
      stride_length: 'resize',
      pelvic_drop: 'body',
      arm_swing: 'hand-left',
      posture: 'body',
      impact: 'flash',
      general: 'analytics',
    };
    return icons[category] || 'analytics';
  };

  // Show error state
  if (error) {
    return (
      <View className="flex-1 bg-terminal-bg items-center justify-center">
        <StatusBar style="light" />
        <Ionicons name="alert-circle" size={64} color="#F26F05" />
        <Text className="text-white text-xl font-bold mt-4">Analysis Error</Text>
        <Text className="text-white/50 mt-2 text-center px-8">{error}</Text>
        <Pressable 
          onPress={() => router.push('/(tabs)')}
          className="mt-6 bg-arisole-orange px-6 py-3 rounded-xl"
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-terminal-bg">
      <StatusBar style="light" />
      
      {isAnalyzing ? (
        // Analysis Loading State
        <View className="flex-1 items-center justify-center">
          <Animated.View entering={FadeIn.duration(500)} className="items-center">
            {/* Skeletal Silhouette with Scan Line */}
            <View className="w-48 h-64 relative mb-8">
              <View className="absolute inset-0 border-2 border-arisole-orange/30 rounded-3xl overflow-hidden">
                {/* Animated Scan Line */}
                <Animated.View 
                  style={[
                    { 
                      position: 'absolute', 
                      left: 0, 
                      right: 0, 
                      height: 2, 
                      backgroundColor: '#F26F05',
                      shadowColor: '#F26F05',
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 1,
                      shadowRadius: 10,
                    },
                    scanLineStyle
                  ]} 
                />
                
                {/* Skeletal Points */}
                {[
                  { x: 50, y: 15 }, // Head
                  { x: 50, y: 35 }, // Shoulders
                  { x: 35, y: 45 }, // Left elbow
                  { x: 65, y: 45 }, // Right elbow
                  { x: 50, y: 55 }, // Hips
                  { x: 40, y: 75 }, // Left knee
                  { x: 60, y: 75 }, // Right knee
                  { x: 35, y: 95 }, // Left foot
                  { x: 65, y: 95 }, // Right foot
                ].map((point, i) => (
                  <View
                    key={i}
                    style={{
                      position: 'absolute',
                      left: `${point.x}%`,
                      top: `${point.y}%`,
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: '#F26F05',
                      shadowColor: '#F26F05',
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.8,
                      shadowRadius: 6,
                      transform: [{ translateX: -4 }, { translateY: -4 }],
                    }}
                  />
                ))}
              </View>
            </View>
            
            <Text className="text-arisole-orange text-xl font-bold">Analyzing Gait</Text>
            <Text className="text-white/50 mt-2">Processing biomechanical data...</Text>
          </Animated.View>
        </View>
      ) : (
        // Results View
        <SafeAreaView className="flex-1">
          <ScrollView 
            className="flex-1" 
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <Animated.View 
              entering={FadeInDown.duration(600)}
              className="px-6 pt-4 pb-2"
            >
              <Pressable 
                onPress={() => router.push('/(tabs)')}
                className="w-10 h-10 rounded-full bg-white/10 items-center justify-center mb-4"
              >
                <Ionicons name="close" size={22} color="white" />
              </Pressable>
              
              <Text className="text-white text-2xl font-bold">Insight Terminal</Text>
              <Text className="text-white/50 text-sm">AI-Powered Gait Analysis</Text>
            </Animated.View>

            {/* Main Score */}
            <Animated.View 
              entering={FadeInDown.delay(200).duration(600)}
              className="items-center py-6"
            >
              <View className="relative">
                <LinearGradient
                  colors={['rgba(242, 111, 5, 0.2)', 'rgba(242, 111, 5, 0.05)']}
                  style={{
                    width: 160,
                    height: 160,
                    borderRadius: 80,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 2,
                    borderColor: 'rgba(242, 111, 5, 0.3)',
                  }}
                >
                  <Text className="text-arisole-orange text-6xl font-bold">
                    {analysis?.gait_score || 0}
                  </Text>
                  <Text className="text-white/50 text-sm">Gait Score</Text>
                </LinearGradient>
                
                {/* Glow Effect */}
                <View 
                  style={{
                    position: 'absolute',
                    inset: -20,
                    borderRadius: 100,
                    backgroundColor: 'rgba(242, 111, 5, 0.1)',
                    zIndex: -1,
                  }}
                />
              </View>
            </Animated.View>

            {/* Gauges */}
            <View className="flex-row justify-around px-6 mb-8">
              <NeonGauge 
                value={analysis?.cadence || 0} 
                maxValue={180} 
                label="Cadence" 
                unit="SPM"
                delay={400}
              />
              <NeonGauge 
                value={Math.round((analysis?.stride_length || 0) * 100)} 
                maxValue={200} 
                label="Stride Length" 
                unit="cm"
                delay={600}
              />
            </View>

            {/* AI Feedback */}
            <View className="px-6">
              <Animated.Text 
                entering={FadeInUp.delay(800).duration(600)}
                className="text-white text-lg font-bold mb-4"
              >
                Biomechanical Feedback
              </Animated.Text>
              
              {feedbackItems.map((item, index) => (
                <FeedbackItem
                  key={index}
                  icon={getCategoryIcon(item.category)}
                  title={item.title}
                  description={item.description}
                  status={item.status as 'good' | 'warning' | 'improve'}
                  delay={900 + index * 100}
                />
              ))}
            </View>

            {/* Action Buttons */}
            <Animated.View 
              entering={FadeInUp.delay(1300).duration(600)}
              className="px-6 mt-4"
            >
              <Pressable onPress={handleSaveAnalysis}>
                <LinearGradient
                  colors={['#F26F05', '#FF8A33']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    borderRadius: 16,
                    marginBottom: 12,
                  }}
                >
                  <View className="flex-row items-center justify-center py-4">
                    <Ionicons 
                      name={user ? "save" : "logo-google"} 
                      size={20} 
                      color="white" 
                    />
                    <Text className="text-white font-bold ml-2">
                      {user ? 'Save Analysis' : 'Sign in to Save Analysis'}
                    </Text>
                  </View>
                </LinearGradient>
              </Pressable>

              <Pressable 
                onPress={handlePostToFeed}
                className="bg-white/10 rounded-2xl py-4 flex-row items-center justify-center border border-white/20"
              >
                <Ionicons name="share-social" size={20} color="white" />
                <Text className="text-white font-semibold ml-2">Post to Feed</Text>
              </Pressable>
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      )}
    </View>
  );
}
