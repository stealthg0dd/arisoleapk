import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  useAnimatedStyle, 
  withSpring,
  interpolateColor,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';

const AnimatedIcon = Animated.createAnimatedComponent(View);

interface TabIconProps {
  focused: boolean;
  iconName: keyof typeof Ionicons.glyphMap;
  activeIconName: keyof typeof Ionicons.glyphMap;
}

function TabIcon({ focused, iconName, activeIconName }: TabIconProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(focused ? 1.1 : 1) }],
  }));

  return (
    <View style={styles.iconContainer}>
      {focused && (
        <View style={styles.glowBackground} />
      )}
      <AnimatedIcon style={animatedStyle}>
        <Ionicons 
          name={focused ? activeIconName : iconName} 
          size={24} 
          color={focused ? '#F26F05' : '#999999'} 
        />
      </AnimatedIcon>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarBackground: () => (
          <BlurView 
            intensity={80} 
            tint="light" 
            style={StyleSheet.absoluteFill}
          />
        ),
        tabBarActiveTintColor: '#F26F05',
        tabBarInactiveTintColor: '#999999',
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabIcon 
              focused={focused} 
              iconName="home-outline" 
              activeIconName="home" 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          tabBarIcon: ({ focused }) => (
            <TabIcon 
              focused={focused} 
              iconName="people-outline" 
              activeIconName="people" 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="achievements"
        options={{
          title: 'Rewards',
          tabBarIcon: ({ focused }) => (
            <TabIcon 
              focused={focused} 
              iconName="trophy-outline" 
              activeIconName="trophy" 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ focused }) => (
            <TabIcon 
              focused={focused} 
              iconName="chatbubbles-outline" 
              activeIconName="chatbubbles" 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <TabIcon 
              focused={focused} 
              iconName="person-outline" 
              activeIconName="person" 
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    height: 70,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderTopWidth: 0,
    elevation: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 32,
  },
  glowBackground: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(242, 111, 5, 0.15)',
  },
});
