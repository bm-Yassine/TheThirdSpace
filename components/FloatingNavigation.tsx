import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { router } from 'expo-router';

type NavButton = 'home' | 'create' | 'favorites' | 'chats' | 'profile';

interface FloatingNavigationProps {
  activeScreen: NavButton;
}

export default function FloatingNavigation({ activeScreen }: FloatingNavigationProps) {
  const navigate = (screen: NavButton) => {
    switch (screen) {
      case 'home':
        router.push('/home' as any);
        break;
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

  const buttons: Array<{ id: NavButton; icon: string; size: number }> = [
    { id: 'create', icon: '➕', size: 50 },
    { id: 'favorites', icon: '💝', size: 50 },
    { id: 'home', icon: '🏠', size: 70 }, // Bigger center button
    { id: 'chats', icon: '💬', size: 50 },
    { id: 'profile', icon: '👤', size: 50 },
  ];

  return (
    <View style={styles.container}>
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
        >
          <View style={styles.iconContainer}>
            <View style={styles.icon}>
              {/* Using text as icons for now - can be replaced with actual icon components */}
              <View style={styles.iconText}>
                {button.id === 'home' && <View style={styles.homeIcon} />}
                {button.id === 'create' && <View style={styles.createIcon} />}
                {button.id === 'favorites' && <View style={styles.heartIcon} />}
                {button.id === 'chats' && <View style={styles.chatIcon} />}
                {button.id === 'profile' && <View style={styles.profileIcon} />}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </View>
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
  },
  iconContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Simple icon representations - replace with actual icons
  homeIcon: {
    width: 24,
    height: 24,
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  createIcon: {
    width: 20,
    height: 2,
    backgroundColor: '#fff',
    position: 'absolute',
  },
  heartIcon: {
    width: 20,
    height: 18,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 10,
    transform: [{ rotate: '45deg' }],
  },
  chatIcon: {
    width: 22,
    height: 18,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 8,
  },
  profileIcon: {
    width: 20,
    height: 20,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 10,
  },
});
