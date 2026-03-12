import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { 
  FadeInDown, 
  FadeInUp,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { useAuth } from '../../context/AuthContext';
import GlassCard from '../../components/GlassCard';

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  isDestructive?: boolean;
  delay: number;
}

function MenuItem({ icon, title, subtitle, onPress, isDestructive, delay }: MenuItemProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <Animated.View 
      entering={FadeInUp.delay(delay).duration(500)}
      style={animatedStyle}
    >
      <Pressable 
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <GlassCard className="flex-row items-center p-4 mb-3">
          <View 
            className={`w-10 h-10 rounded-full items-center justify-center mr-4 ${
              isDestructive ? 'bg-red-100' : 'bg-arisole-orange/10'
            }`}
          >
            <Ionicons 
              name={icon} 
              size={20} 
              color={isDestructive ? '#EF4444' : '#F26F05'} 
            />
          </View>
          <View className="flex-1">
            <Text 
              className={`font-semibold ${
                isDestructive ? 'text-red-500' : 'text-text-primary'
              }`}
            >
              {title}
            </Text>
            {subtitle && (
              <Text className="text-text-muted text-xs mt-0.5">{subtitle}</Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </GlassCard>
      </Pressable>
    </Animated.View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut, signInWithGoogle } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Log Out', 
          style: 'destructive',
          onPress: async () => {
            await signOut();
          }
        },
      ]
    );
  };

  const handleSignIn = async () => {
    await signInWithGoogle();
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-light">
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View 
          entering={FadeInDown.duration(600)}
          className="px-6 pt-4 pb-6"
        >
          <Text className="text-text-primary text-2xl font-bold">Profile</Text>
          <Text className="text-text-secondary text-sm">Manage your account</Text>
        </Animated.View>

        {/* Profile Card */}
        <Animated.View 
          entering={FadeInDown.delay(200).duration(600)}
          className="px-6 mb-6"
        >
          <LinearGradient
            colors={['#F26F05', '#FF8A33', '#FFCBA4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 24,
              padding: 24,
              shadowColor: '#F26F05',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
              elevation: 8,
            }}
          >
            <View className="flex-row items-center">
              <View className="w-20 h-20 rounded-full bg-white/20 items-center justify-center mr-4">
                {user ? (
                  <Text className="text-white text-3xl font-bold">
                    {user.email?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                ) : (
                  <Ionicons name="person" size={36} color="white" />
                )}
              </View>
              <View className="flex-1">
                <Text className="text-white text-xl font-bold">
                  {user?.email?.split('@')[0] || 'Guest User'}
                </Text>
                <Text className="text-white/80 text-sm">
                  {user?.email || 'Sign in to save your progress'}
                </Text>
                {user && (
                  <View className="flex-row items-center mt-2">
                    <View className="bg-white/20 px-3 py-1 rounded-full flex-row items-center">
                      <Ionicons name="checkmark-circle" size={14} color="white" />
                      <Text className="text-white text-xs ml-1 font-medium">Verified</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {!user && (
              <Pressable 
                onPress={handleSignIn}
                className="bg-white/20 mt-4 py-3 rounded-xl flex-row items-center justify-center"
              >
                <Ionicons name="logo-google" size={20} color="white" />
                <Text className="text-white font-semibold ml-2">Sign in with Google</Text>
              </Pressable>
            )}
          </LinearGradient>
        </Animated.View>

        {/* Stats Summary */}
        <Animated.View 
          entering={FadeInUp.delay(300).duration(600)}
          className="px-6 mb-6"
        >
          <GlassCard className="p-4">
            <View className="flex-row justify-around">
              <View className="items-center">
                <Text className="text-arisole-orange text-2xl font-bold">24</Text>
                <Text className="text-text-muted text-xs">Walks</Text>
              </View>
              <View className="w-px bg-gray-200" />
              <View className="items-center">
                <Text className="text-arisole-orange text-2xl font-bold">84</Text>
                <Text className="text-text-muted text-xs">Avg Score</Text>
              </View>
              <View className="w-px bg-gray-200" />
              <View className="items-center">
                <Text className="text-metallic-gold text-2xl font-bold">3</Text>
                <Text className="text-text-muted text-xs">Badges</Text>
              </View>
            </View>
          </GlassCard>
        </Animated.View>

        {/* Menu Items */}
        <View className="px-6">
          <Animated.Text 
            entering={FadeInUp.delay(400).duration(500)}
            className="text-text-secondary text-sm font-medium mb-3 uppercase tracking-wider"
          >
            Activity
          </Animated.Text>
          
          <MenuItem 
            icon="time-outline" 
            title="Activity History" 
            subtitle="View all your past analyses"
            delay={450}
          />
          <MenuItem 
            icon="stats-chart-outline" 
            title="Progress Insights" 
            subtitle="Track your improvement over time"
            delay={500}
          />
          <MenuItem 
            icon="calendar-outline" 
            title="Weekly Goals" 
            subtitle="Set and track weekly targets"
            delay={550}
          />

          <Animated.Text 
            entering={FadeInUp.delay(600).duration(500)}
            className="text-text-secondary text-sm font-medium mb-3 mt-4 uppercase tracking-wider"
          >
            Preferences
          </Animated.Text>
          
          <MenuItem 
            icon="heart-outline" 
            title="Wellness Preferences" 
            subtitle="Customize your health profile"
            delay={650}
          />
          <MenuItem 
            icon="notifications-outline" 
            title="Notifications" 
            subtitle="Manage alerts and reminders"
            delay={700}
          />
          <MenuItem 
            icon="shield-checkmark-outline" 
            title="Privacy & Data" 
            subtitle="Control your data sharing"
            delay={750}
          />

          <Animated.Text 
            entering={FadeInUp.delay(800).duration(500)}
            className="text-text-secondary text-sm font-medium mb-3 mt-4 uppercase tracking-wider"
          >
            Support
          </Animated.Text>
          
          <MenuItem 
            icon="help-circle-outline" 
            title="Help Center" 
            subtitle="FAQs and support articles"
            delay={850}
          />
          <MenuItem 
            icon="chatbubbles-outline" 
            title="Contact Us" 
            subtitle="Get in touch with our team"
            delay={900}
          />

          {user && (
            <>
              <View className="h-4" />
              <MenuItem 
                icon="log-out-outline" 
                title="Log Out" 
                isDestructive
                onPress={handleLogout}
                delay={950}
              />
            </>
          )}
        </View>

        {/* App Version */}
        <Animated.View 
          entering={FadeInUp.delay(1000).duration(500)}
          className="items-center mt-8 mb-4"
        >
          <Text className="text-text-muted text-xs">Arisole StrideIQ v1.0.0</Text>
          <Text className="text-text-muted text-xs mt-1">Made with ❤️ for better health</Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
