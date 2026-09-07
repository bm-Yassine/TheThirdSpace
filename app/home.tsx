import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import FloatingNavigation from '../components/FloatingNavigation';
import DiscoverView from '../components/home/DiscoverView';
import CardsView from '../components/home/CardsView';
import MapView from '../components/home/MapView';

type ViewMode = 'discover' | 'cards' | 'map';

const ORDER: ViewMode[] = ['discover', 'cards', 'map'];

export default function HomeScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>('discover');
  const [renderedMode, setRenderedMode] = useState<ViewMode>('discover');
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigationTone: 'light' | 'dark' = 'light';

  // Cross-fade with a slight directional slide, so switching lenses reads as
  // moving between them rather than the screen being replaced. The three views
  // show the same events, and an instant swap made them feel like separate
  // sections of the app.
  const transition = useRef(new Animated.Value(1)).current;
  const direction = useRef(0);

  const changeView = useCallback(
    (next: ViewMode) => {
      if (next === viewMode) return;
      direction.current = ORDER.indexOf(next) > ORDER.indexOf(viewMode) ? 1 : -1;
      setViewMode(next);
    },
    [viewMode]
  );

  useEffect(() => {
    if (viewMode === renderedMode) return;

    // Fade the outgoing view out, swap, then bring the incoming one in.
    Animated.timing(transition, {
      toValue: 0,
      duration: 140,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      setRenderedMode(viewMode);
      Animated.timing(transition, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  }, [viewMode, renderedMode, transition]);

  const translateX = transition.interpolate({
    inputRange: [0, 1],
    outputRange: [direction.current * 22, 0],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.viewport, { opacity: transition, transform: [{ translateX }] }]}>
        {renderedMode === 'discover' && (
          <DiscoverView
            currentIndex={currentIndex}
            setCurrentIndex={setCurrentIndex}
            viewMode={viewMode}
            setViewMode={changeView}
          />
        )}
        {renderedMode === 'cards' && <CardsView viewMode={viewMode} setViewMode={changeView} />}
        {renderedMode === 'map' && <MapView viewMode={viewMode} setViewMode={changeView} />}
      </Animated.View>

      <FloatingNavigation activeScreen="home" tone={navigationTone} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f1a',
  },
  viewport: {
    flex: 1,
  },
});
