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
      {/* Content - Render selected view */}
      {viewMode === 'discover' && (
        <DiscoverView 
          currentIndex={currentIndex} 
          setCurrentIndex={setCurrentIndex}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />
      )}
      {viewMode === 'cards' && (
        <CardsView 
          viewMode={viewMode}
          setViewMode={setViewMode}
        />
      )}
      {viewMode === 'map' && (
        <MapView 
          viewMode={viewMode}
          setViewMode={setViewMode}
        />
      )}

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
});
