import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { getCachedEventFeed, preloadEventFeed } from '../../lib/eventFeed';
import { formatEventDate, formatEventTime } from '../../lib/eventTime';
import TileMap, { type MapMarker } from '../TileMap';
import type { Event } from '../../lib/types';

interface MapViewProps {
  viewMode: 'discover' | 'cards' | 'map';
  setViewMode: (mode: 'discover' | 'cards' | 'map') => void;
}

import { DEFAULT_MAP_CENTER } from '../../lib/config';

/** Where the map opens when no event carries coordinates. */
const DEFAULT_CENTER = DEFAULT_MAP_CENTER;

export default function MapView({ viewMode, setViewMode }: MapViewProps) {
  const cached = getCachedEventFeed() ?? [];
  const [events, setEvents] = useState<Event[]>(cached);
  const [loading, setLoading] = useState(cached.length === 0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    preloadEventFeed({ limit: 50, maxItems: 50 })
      .then((next) => {
        if (isMounted) setEvents(next);
      })
      .catch((error) => console.error('Error fetching events:', error))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Only events with real coordinates can be placed on a map.
  const locatedEvents = useMemo(
    () =>
      events.filter(
        (event) =>
          typeof event.latitude === 'number' &&
          typeof event.longitude === 'number' &&
          Number.isFinite(event.latitude) &&
          Number.isFinite(event.longitude)
      ),
    [events]
  );

  const markers = useMemo<MapMarker[]>(
    () =>
      locatedEvents.map((event) => ({
        id: String(event.id),
        latitude: event.latitude as number,
        longitude: event.longitude as number,
        label: event.title,
        selected: String(event.id) === selectedId,
      })),
    [locatedEvents, selectedId]
  );

  /**
   * Centre on the median coordinate rather than the mean.
   *
   * A mean centroid is pulled apart by outliers: a handful of events in one
   * city and one in another puts the centre in the ocean between them, showing
   * empty water and no pins. The median always lands inside the densest
   * cluster, which is where the user's events almost always are.
   */
  const center = useMemo(() => {
    if (locatedEvents.length === 0) return DEFAULT_CENTER;

    const median = (values: number[]) => {
      const sorted = [...values].sort((a, b) => a - b);
      const middle = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0
        ? (sorted[middle - 1] + sorted[middle]) / 2
        : sorted[middle];
    };

    return {
      latitude: median(locatedEvents.map((event) => event.latitude as number)),
      longitude: median(locatedEvents.map((event) => event.longitude as number)),
    };
  }, [locatedEvents]);

  const selectedEvent = useMemo(
    () => locatedEvents.find((event) => String(event.id) === selectedId) || null,
    [locatedEvents, selectedId]
  );

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

      <TileMap
        markers={markers}
        initialCenter={center}
        initialZoom={11}
        onMarkerPress={(marker) => setSelectedId(marker.id)}
      />

      {locatedEvents.length === 0 && (
        <View style={styles.emptyOverlay} pointerEvents="none">
          <Text style={styles.emptyEmoji}>🗺️</Text>
          <Text style={styles.emptyTitle}>No events to map yet</Text>
          <Text style={styles.emptyBody}>
            Events show up here once they have a location with coordinates.
          </Text>
        </View>
      )}

      {selectedEvent && (
        <Pressable
          style={styles.selectedCard}
          onPress={() =>
            router.push({
              pathname: '/activity_detail',
              params: { eventId: String(selectedEvent.id) },
            })
          }
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.selectedTitle} numberOfLines={1}>
              {selectedEvent.title}
            </Text>
            <Text style={styles.selectedMeta} numberOfLines={1}>
              {formatEventDate(selectedEvent)} • {formatEventTime(selectedEvent)}
            </Text>
            <Text style={styles.selectedMeta} numberOfLines={1}>
              {selectedEvent.location}
            </Text>
          </View>
          <Text style={styles.selectedCta}>View</Text>
        </Pressable>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  emptyOverlay: {
    position: 'absolute',
    top: '38%',
    left: 24,
    right: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 16,
    padding: 20,
  },
  emptyEmoji: { fontSize: 34, marginBottom: 6 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  emptyBody: { fontSize: 13, color: '#6b7280', textAlign: 'center', marginTop: 4 },

  selectedCard: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 104,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  selectedTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  selectedMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  selectedCta: { fontSize: 13, fontWeight: '700', color: '#4f46e5' },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  loadingText: {
    color: '#000',
    fontSize: 16,
    marginTop: 16,
  },
  container: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
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
