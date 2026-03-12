import { View, Text, ScrollView, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  FadeInDown, 
  FadeInUp,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';

const { width } = Dimensions.get('window');
const STICKER_SIZE = (width - 72) / 2;

interface AchievementStickerProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  unlocked: boolean;
  isGold?: boolean;
  delay: number;
}

function AchievementSticker({ icon, title, description, unlocked, isGold, delay }: AchievementStickerProps) {
  const rotation = useSharedValue(0);
  const shine = useSharedValue(0);

  useEffect(() => {
    if (unlocked) {
      rotation.value = withRepeat(
        withSequence(
          withTiming(-2, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(2, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      
      shine.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2000 }),
          withTiming(0, { duration: 2000 })
        ),
        -1,
        false
      );
    }
  }, [unlocked]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const gradientColors: readonly [string, string, string] = isGold 
    ? ['#D4AF37', '#E6C65A', '#D4AF37'] as const
    : ['#F26F05', '#FF8A33', '#FFCBA4'] as const;
  
  const lockedColors: readonly [string, string, string] = ['#E5E5E5', '#D1D1D1', '#C0C0C0'] as const;

  return (
    <Animated.View
      entering={FadeInUp.delay(delay).duration(600)}
      style={[{ width: STICKER_SIZE, marginBottom: 20 }, animatedStyle]}
    >
      <Pressable>
        <View
          style={{
            borderRadius: 24,
            overflow: 'hidden',
            shadowColor: unlocked ? (isGold ? '#D4AF37' : '#F26F05') : '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: unlocked ? 0.4 : 0.1,
            shadowRadius: 16,
            elevation: unlocked ? 12 : 4,
          }}
        >
          <LinearGradient
            colors={unlocked ? gradientColors : lockedColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ padding: 3, borderRadius: 24 }}
          >
            <View className="bg-white rounded-card p-4 items-center">
              {/* Badge Icon */}
              <View 
                style={{
                  width: 70,
                  height: 70,
                  borderRadius: 35,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}
              >
                <LinearGradient
                  colors={unlocked ? gradientColors : lockedColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 70,
                    height: 70,
                    borderRadius: 35,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <View className="bg-white/30 w-14 h-14 rounded-full items-center justify-center">
                    <Ionicons 
                      name={unlocked ? icon : 'lock-closed'} 
                      size={28} 
                      color="white" 
                    />
                  </View>
                </LinearGradient>
              </View>

              {/* Title & Description */}
              <Text 
                className={`font-bold text-center ${unlocked ? 'text-text-primary' : 'text-text-muted'}`}
                numberOfLines={1}
              >
                {title}
              </Text>
              <Text 
                className="text-text-secondary text-xs text-center mt-1"
                numberOfLines={2}
              >
                {description}
              </Text>

              {/* Status Badge */}
              <View 
                className={`mt-3 px-3 py-1 rounded-full ${
                  unlocked 
                    ? isGold ? 'bg-metallic-gold/10' : 'bg-arisole-orange/10'
                    : 'bg-gray-100'
                }`}
              >
                <Text 
                  className={`text-xs font-semibold ${
                    unlocked 
                      ? isGold ? 'text-metallic-gold' : 'text-arisole-orange'
                      : 'text-text-muted'
                  }`}
                >
                  {unlocked ? 'Unlocked' : 'Locked'}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function AchievementsScreen() {
  const achievements = [
    { icon: 'flash', title: '1st Perfect Strike', description: 'Score 95+ on your first analysis', unlocked: true, isGold: true },
    { icon: 'footsteps', title: 'Stride Master', description: 'Complete 10 gait analyses', unlocked: true },
    { icon: 'trending-up', title: 'Consistency King', description: 'Improve score 5 times in a row', unlocked: true },
    { icon: 'star', title: 'Elite Walker', description: 'Reach a score of 98+', unlocked: false, isGold: true },
    { icon: 'calendar', title: 'Week Warrior', description: 'Record walks 7 days straight', unlocked: false },
    { icon: 'people', title: 'Community Star', description: 'Get 100 likes on your posts', unlocked: false },
    { icon: 'ribbon', title: 'Perfectionist', description: 'Score 100 on any metric', unlocked: false, isGold: true },
    { icon: 'heart', title: 'Health Hero', description: 'Complete 50 total analyses', unlocked: false },
  ];

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <SafeAreaView className="flex-1 bg-bg-light">
      {/* Header */}
      <Animated.View 
        entering={FadeInDown.duration(600)}
        className="px-6 pt-4 pb-4"
      >
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-text-primary text-2xl font-bold">Achievements</Text>
            <Text className="text-text-secondary text-sm">Your Rewards Scrapbook</Text>
          </View>
          <View className="items-center">
            <LinearGradient
              colors={['#D4AF37', '#E6C65A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
              }}
            >
              <Text className="text-white font-bold">{unlockedCount}/{achievements.length}</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Progress Bar */}
        <View className="mt-4 bg-gray-200 h-2 rounded-full overflow-hidden">
          <LinearGradient
            colors={['#D4AF37', '#E6C65A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              width: `${(unlockedCount / achievements.length) * 100}%`,
              height: '100%',
              borderRadius: 4,
            }}
          />
        </View>
        <Text className="text-text-muted text-xs mt-2 text-center">
          {achievements.length - unlockedCount} more achievements to unlock!
        </Text>
      </Animated.View>

      {/* Achievements Grid */}
      <ScrollView 
        className="flex-1 px-6" 
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row flex-wrap justify-between">
          {achievements.map((achievement, index) => (
            <AchievementSticker
              key={index}
              icon={achievement.icon as keyof typeof Ionicons.glyphMap}
              title={achievement.title}
              description={achievement.description}
              unlocked={achievement.unlocked}
              isGold={achievement.isGold}
              delay={index * 100}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
