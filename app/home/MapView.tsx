import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { dataService } from '../../Backend/firebase';
import { mockEvents } from '../../lib/events';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function MapView() {
  const [eventsCount, setEventsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEventsCount = async () => {
      try {
        const events = await dataService.getEvents({ limit: 50 });
        // Combine database events with demo events for total count
        const dbEventIds = new Set(events.map(e => e.id.toString()));
        const demoEventsFiltered = mockEvents.filter(e => !dbEventIds.has(e.id.toString()));
        const totalEvents = events.length + demoEventsFiltered.length;
        setEventsCount(totalEvents);
      } catch (error) {
        console.error('Error fetching events:', error);
        // Fallback to demo events count
        setEventsCount(mockEvents.length);
      } finally {
        setLoading(false);
      }
    };

    fetchEventsCount();
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
});
