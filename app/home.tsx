import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import FloatingNavigation from '../components/FloatingNavigation';
import DiscoverView from './home/DiscoverView';
import CardsView from './home/CardsView';
import MapView from './home/MapView';

type ViewMode = 'discover' | 'cards' | 'map';

export default function HomeScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>('discover');
  const [currentIndex, setCurrentIndex] = useState(0);

  return (
    <View style={styles.container}>
      {/* View Mode Selector - Top Right */}
      <View style={styles.viewSwitcher}>
        <TouchableOpacity
          style={[
            styles.viewButton,
            viewMode === 'discover' && styles.viewButtonActive,
          ]}
          onPress={() => setViewMode('discover')}
        >
          <Text style={[
            styles.viewButtonText,
            viewMode === 'discover' && styles.viewButtonTextActive,
          ]}>
            Discover
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.viewButton,
            viewMode === 'cards' && styles.viewButtonActive,
          ]}
          onPress={() => setViewMode('cards')}
        >
          <Text style={[
            styles.viewButtonText,
            viewMode === 'cards' && styles.viewButtonTextActive,
          ]}>
            Cards
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.viewButton,
            viewMode === 'map' && styles.viewButtonActive,
          ]}
          onPress={() => setViewMode('map')}
        >
          <Text style={[
            styles.viewButtonText,
            viewMode === 'map' && styles.viewButtonTextActive,
          ]}>
            Map
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content - Render selected view */}
      {viewMode === 'discover' && (
        <DiscoverView 
          currentIndex={currentIndex} 
          setCurrentIndex={setCurrentIndex} 
        />
      )}
      {viewMode === 'cards' && <CardsView />}
      {viewMode === 'map' && <MapView />}

      {/* Floating Navigation */}
      <FloatingNavigation activeScreen="home" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  viewSwitcher: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 90 : 70,
    right: 16,
    gap: 12,
    zIndex: 10,
  },
  viewButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  viewButtonActive: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderColor: 'rgba(0, 0, 0, 0.8)',
  },
  viewButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  viewButtonTextActive: {
    color: '#fff',
  },
});
