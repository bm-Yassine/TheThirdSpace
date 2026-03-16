import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { dataService, authService } from '../Backend/firebase';
import { Event } from '../lib/types';
import FloatingNavigation from '../components/FloatingNavigation';
import { preloadEventFeed } from '../lib/eventFeed';

export default function FavoritesScreen() {
  const [favoriteEvents, setFavoriteEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        Alert.alert('Authentication Required', 'Please sign in to view your favorites.', [
          { text: 'OK', onPress: () => router.replace('/login') }
        ]);
        return;
      }

      const favoriteIds = (await dataService.getUserFavorites()).map((id) => id.toString());
      const idsSet = new Set(favoriteIds);

      // Build from preloaded feed first so mock+firebase events both work.
      const feed = await preloadEventFeed({ limit: 60, maxItems: 60 });
      const fromFeed = feed.filter((event) => idsSet.has(String(event.id)));

      // Backfill any missing ids directly from data source.
      const missingIds = favoriteIds.filter(
        (id) => !fromFeed.some((event) => String(event.id) === id)
      );
      const missingEvents = await Promise.all(missingIds.map((id) => dataService.getEvent(id)));
      const backfilled = missingEvents.filter(Boolean) as Event[];

      const combined = [...fromFeed, ...backfilled];
      setFavoriteEvents(combined);
    } catch (error) {
      console.error('Error loading favorites:', error);
      Alert.alert('Error', 'Failed to load favorites.');
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (eventId: number | string) => {
    try {
      await dataService.removeFromFavorites(eventId.toString());
      // Remove from local state
      setFavoriteEvents(prev => prev.filter(e => String(e.id) !== eventId.toString()));
      Alert.alert('Removed', 'Event removed from favorites.');
    } catch (error) {
      console.error('Error removing favorite:', error);
      Alert.alert('Error', 'Failed to remove from favorites.');
    }
  };

  const handleEventClick = (eventId: number | string) => {
    router.push({
      pathname: './activity_detail',
      params: { eventId: eventId.toString() }
    });
  };

  const handleOrganizerClick = (organizerName: string, organizerUid?: string) => {
    router.push({
      pathname: './organizer_info',
      params: { organizerName, organizerUid: organizerUid || '' }
    });
  };

  const renderEvent = ({ item }: { item: Event }) => (
    <Pressable 
      style={styles.eventCard}
      onPress={() => handleEventClick(item.id)}
    >
      <Image
        source={{ uri: item.imageUrl }}
        style={styles.eventImage}
        resizeMode="cover"
      />
      
      {/* Remove from favorites button */}
      <TouchableOpacity
        style={styles.removeButton}
        onPress={(e) => {
          e.stopPropagation();
          Alert.alert(
            'Remove Favorite',
            'Remove this event from your favorites?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Remove', style: 'destructive', onPress: () => removeFavorite(item.id) }
            ]
          );
        }}
      >
        <Text style={styles.removeButtonText}>✕</Text>
      </TouchableOpacity>

      <View style={styles.eventContent}>
        <Text style={styles.eventTitle}>{item.title}</Text>
        
        {/* Make organizer name clickable */}
        <Pressable onPress={(e) => {
          e.stopPropagation();
          handleOrganizerClick(item.organizer.name, item.organizer.uid);
        }}>
          <Text style={styles.eventOrganizer}>by {item.organizer.name}</Text>
        </Pressable>
        
        <Text style={styles.eventDetails}>
          {item.date} • {item.time}
        </Text>
        <Text style={styles.eventLocation}>{item.location}</Text>
        <View style={styles.tagsContainer}>
          {item.tags?.slice(0, 3).map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
        {item.cost && item.cost > 0 ? (
          <Text style={styles.cost}>${item.cost}</Text>
        ) : (
          <Text style={styles.free}>Free</Text>
        )}
      </View>
    </Pressable>
  );

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={{ marginTop: 16, color: '#666' }}>Loading favorites...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Favorites</Text>
        {favoriteEvents.length > 0 && (
          <Text style={styles.headerCount}>{favoriteEvents.length} events</Text>
        )}
      </View>

      {/* Content */}
      {favoriteEvents.length > 0 ? (
        <FlatList
          data={favoriteEvents}
          renderItem={renderEvent}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>💝</Text>
          <Text style={styles.emptyTitle}>No Favorites Yet</Text>
          <Text style={styles.emptyText}>
            Events you favorite will appear here
          </Text>
          <TouchableOpacity
            style={styles.exploreButton}
            onPress={() => router.push('/home')}
          >
            <Text style={styles.exploreButtonText}>Explore Events</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Floating Navigation */}
      <FloatingNavigation activeScreen="favorites" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerCount: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  eventImage: {
    width: '100%',
    height: 200,
  },
  eventContent: {
    padding: 16,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  eventOrganizer: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  eventDetails: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 14,
    color: '#888',
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  tag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 12,
    color: '#333',
  },
  cost: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  free: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  exploreButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  exploreButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  removeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
