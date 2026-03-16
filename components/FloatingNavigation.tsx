import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { router } from 'expo-router';
import { authService } from '../Backend/firebase';
import { Svg, Path, Circle, Rect, Line } from 'react-native-svg';

type NavButton = 'home' | 'create' | 'favorites' | 'chats' | 'profile';

interface FloatingNavigationProps {
  activeScreen: NavButton;
}

export default function FloatingNavigation({ activeScreen }: FloatingNavigationProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const floatAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const checkAuth = () => {
      const user = authService.getCurrentUser();
      setIsLoggedIn(!!user);
    };

    checkAuth();
    
    // Listen for auth state changes
    const unsubscribe = authService.onAuthStateChange((user) => {
      setIsLoggedIn(!!user);
    });

    return () => unsubscribe();
  }, []);

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
  }, []);

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

  const buttons: Array<{ id: NavButton; size: number }> = [
    { id: 'create', size: 50 },
    { id: 'favorites', size: 50 },
    { id: 'home', size: 70 }, // Bigger center button
    { id: 'chats', size: 50 },
    { id: 'profile', size: 50 },
  ];

  const renderIcon = (buttonId: NavButton, size: number, isActive: boolean) => {
    const iconSize = size * 0.45;
    const color = '#FFFFFF';

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
              stroke={color} 
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
              stroke={color} 
              strokeWidth="2.5" 
              strokeLinecap="round" 
            />
            <Line 
              x1="5" 
              y1="12" 
              x2="19" 
              y2="12" 
              stroke={color} 
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
              stroke={color}
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
              stroke={color}
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
              stroke={color} 
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
            },
            activeScreen === button.id && styles.activeButton,
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
    bottom: 40,
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
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(10px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  activeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#6366F1',
    shadowOpacity: 0.5,
  },
  iconContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
