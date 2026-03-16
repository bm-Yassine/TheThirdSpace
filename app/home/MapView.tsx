import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { getCachedEventFeed, preloadEventFeed } from '../../lib/eventFeed';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface MapViewProps {
  viewMode: 'discover' | 'cards' | 'map';
  setViewMode: (mode: 'discover' | 'cards' | 'map') => void;
}

export default function MapView({ viewMode, setViewMode }: MapViewProps) {
  const cachedCount = getCachedEventFeed()?.length ?? 0;
  const [eventsCount, setEventsCount] = useState(cachedCount);
  const [loading, setLoading] = useState(cachedCount === 0);

  useEffect(() => {
    const cachedEvents = getCachedEventFeed();
    if (cachedEvents?.length) {
      setEventsCount(cachedEvents.length);
      setLoading(false);
    }

    let isMounted = true;

    const fetchEventsCount = async () => {
      try {
        const events = await preloadEventFeed({ limit: 50, maxItems: 50 });
        if (isMounted) {
          setEventsCount(events.length);
        }
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchEventsCount();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Right View Selector */}
      <View style={styles.topRightControls}>
        <View style={styles.viewSelectorContainer}>
          {/* Vertical Rectangle - Discovery View */}
          <TouchableOpacity
            style={[
              styles.viewSelectorButton,
              viewMode === 'discover' && styles.viewSelectorActive,
            ]}
            onPress={() => setViewMode('discover')}
          >
            <View style={styles.verticalRectangle}>
              <View style={[
                styles.verticalRectangleInner,
                viewMode === 'discover' && styles.iconActive
              ]} />
            </View>
          </TouchableOpacity>

          {/* Horizontal Rectangle - Cards View */}
          <TouchableOpacity
            style={[
              styles.viewSelectorButton,
              viewMode === 'cards' && styles.viewSelectorActive,
            ]}
            onPress={() => setViewMode('cards')}
          >
            <View style={styles.horizontalRectangle}>
              <View style={[
                styles.horizontalRectangleInner,
                viewMode === 'cards' && styles.iconActive
              ]} />
            </View>
          </TouchableOpacity>

          {/* Map Pin Icon - Map View */}
          <TouchableOpacity
            style={[
              styles.viewSelectorButton,
              viewMode === 'map' && styles.viewSelectorActive,
            ]}
            onPress={() => setViewMode('map')}
          >
            <View style={styles.mapPinContainer}>
              <View style={[
                styles.mapPin,
                viewMode === 'map' && styles.iconActive
              ]}>
                <View style={[
                  styles.mapPinInner,
                  viewMode === 'map' && styles.mapPinInnerActive
                ]} />
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapPlaceholderText}>🗺️</Text>
        <Text style={styles.mapText}>Map View</Text>
        <Text style={styles.mapSubtext}>
          {`${eventsCount} events near you`}
        </Text>
        <Text style={styles.infoText}>
          Map integration coming soon
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    color: '#000',
    fontSize: 16,
    marginTop: 16,
  },
  container: {
    flex: 1,
    height: SCREEN_HEIGHT,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  mapPlaceholderText: {
    fontSize: 64,
    marginBottom: 16,
  },
  mapText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
  },
  mapSubtext: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  topRightControls: {
    position: 'absolute',
    top: 60,
    right: 16,
    zIndex: 40,
  },
  viewSelectorContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 24,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  viewSelectorButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
  },
  viewSelectorActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  verticalRectangle: {
    width: 18,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verticalRectangleInner: {
    width: 12,
    height: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 3,
  },
  horizontalRectangle: {
    width: 24,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  horizontalRectangleInner: {
    width: 20,
    height: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 3,
  },
  mapPinContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPin: {
    width: 16,
    height: 20,
    borderRadius: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    transform: [{ rotate: '-45deg' }],
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPinInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  mapPinInnerActive: {
    backgroundColor: '#fff',
  },
  iconActive: {
    borderColor: '#fff',
    opacity: 1,
  },
});
