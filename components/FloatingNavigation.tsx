import React, { useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../lib/auth';
import { Svg, Path, Circle, Rect, Line } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type NavButton = 'home' | 'create' | 'favorites' | 'chats' | 'profile';

interface FloatingNavigationProps {
  activeScreen: NavButton;
  tone?: 'light' | 'dark';
}

export default function FloatingNavigation({ activeScreen, tone = 'dark' }: FloatingNavigationProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const floatAnimation = useRef(new Animated.Value(0)).current;

  // Floating animation - slow up and down movement
  useEffect(() => {
    const animate = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnimation, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(floatAnimation, {
            toValue: 0,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    animate();
  }, [floatAnimation]);

  const translateY = floatAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  const navigate = (screen: NavButton) => {
    // Allow home screen access without login
    if (screen === 'home') {
      router.push('/home' as any);
      return;
    }

    // Check if user is logged in for other tabs
    if (!isLoggedIn) {
      Alert.alert(
        'Login Required',
        'Please sign in to access this feature.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/login' as any) }
        ]
      );
      return;
    }

    // Navigate to the requested screen
    switch (screen) {
      case 'create':
        router.push('/create' as any);
        break;
      case 'favorites':
        router.push('/favorites' as any);
        break;
      case 'chats':
        router.push('/chats' as any);
        break;
      case 'profile':
        router.push('/profile' as any);
        break;
    }
  };

  const buttons: { id: NavButton; size: number }[] = [
    { id: 'create', size: 50 },
    { id: 'favorites', size: 50 },
    { id: 'home', size: 70 }, // Bigger center button
    { id: 'chats', size: 50 },
    { id: 'profile', size: 50 },
  ];

  const iconColor = tone === 'light' ? '#ffffff' : '#111827';
  const buttonColor = tone === 'light' ? 'rgba(255, 255, 255, 0.16)' : 'rgba(17, 24, 39, 0.08)';
  const buttonBorderColor = tone === 'light' ? 'rgba(255, 255, 255, 0.28)' : 'rgba(17, 24, 39, 0.24)';
  const activeButtonColor = tone === 'light' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(17, 24, 39, 0.18)';
  const activeBorderColor = tone === 'light' ? 'rgba(255, 255, 255, 0.45)' : 'rgba(17, 24, 39, 0.4)';

  const renderIcon = (buttonId: NavButton, size: number, isActive: boolean) => {
    const iconSize = size * 0.45;

    switch (buttonId) {
      case 'home':
        // Square icon
        return (
          <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24">
            <Rect 
              x="4" 
              y="4" 
              width="16" 
              height="16" 
              rx="2" 
              fill="none" 
              stroke={iconColor} 
              strokeWidth="2.5" 
            />
          </Svg>
        );
      
      case 'create':
        // Plus symbol
        return (
          <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24">
            <Line 
              x1="12" 
              y1="5" 
              x2="12" 
              y2="19" 
              stroke={iconColor} 
              strokeWidth="2.5" 
              strokeLinecap="round" 
            />
            <Line 
              x1="5" 
              y1="12" 
              x2="19" 
              y2="12" 
              stroke={iconColor} 
              strokeWidth="2.5" 
              strokeLinecap="round" 
            />
          </Svg>
        );
      
      case 'favorites':
        // Heart symbol
        return (
          <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24">
            <Path
              d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
              fill="none"
              stroke={iconColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        );
      
      case 'chats':
        // Chat bubble
        return (
          <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24">
            <Path
              d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
              fill="none"
              stroke={iconColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        );
      
      case 'profile':
        // Circle
        return (
          <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24">
            <Circle 
              cx="12" 
              cy="12" 
              r="8" 
              fill="none" 
              stroke={iconColor} 
              strokeWidth="2.5" 
            />
          </Svg>
        );
      
      default:
        return null;
    }
  };

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          bottom: Math.max(insets.bottom - 4, 8),
          transform: [{ translateY }],
        },
      ]}
    >
      {buttons.map((button) => (
        <TouchableOpacity
          key={button.id}
          style={[
            styles.button,
            {
              width: button.size,
              height: button.size,
              borderRadius: button.size / 2,
              backgroundColor: buttonColor,
              borderColor: buttonBorderColor,
            },
            activeScreen === button.id && {
              backgroundColor: activeButtonColor,
              borderColor: activeBorderColor,
              shadowColor: tone === 'light' ? '#ffffff' : '#111827',
              shadowOpacity: 0.35,
            },
          ]}
          onPress={() => navigate(button.id)}
          activeOpacity={0.8}
        >
          <View style={styles.iconContainer}>
            {renderIcon(button.id, button.size, activeScreen === button.id)}
          </View>
        </TouchableOpacity>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 15,
    paddingHorizontal: 20,
    zIndex: 1000,
  },
  button: {
    backdropFilter: 'blur(10px)',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
