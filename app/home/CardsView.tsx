import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { dataService } from '../../Backend/firebase';
import { Event } from '../../lib/types';
import { mockEvents } from '../../lib/events';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function CardsView() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const fetchedEvents = await dataService.getEvents({ limit: 15 });
        // Combine database events with demo events, avoiding duplicates by ID
        const dbEventIds = new Set(fetchedEvents.map(e => e.id.toString()));
        const demoEventsFiltered = mockEvents.filter(e => !dbEventIds.has(e.id.toString()));
        const combinedEvents = [...fetchedEvents, ...demoEventsFiltered].slice(0, 25); // Limit total
        setEvents(combinedEvents as Event[]);
      } catch (error) {
        console.error('Error fetching events:', error);
        // Fallback to demo events if database fails
        setEvents(mockEvents.slice(0, 20));
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const handleEventClick = (eventId: number | string) => {
    router.push({
      pathname: '../activity_detail',
      params: { eventId: eventId.toString() }
    });
  };

  const handleOrganizerClick = (organizerName: string) => {
    router.push({
      pathname: '../organizer_info',
      params: { organizerName }
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>Loading events...</Text>
      </View>
    );
  }

  if (events.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No events found</Text>
        <Text style={styles.emptySubtext}>Create your first event!</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.cardsScroll}
      contentContainerStyle={styles.cardsContent}
      showsVerticalScrollIndicator={false}
    >
      {events.map((event) => (
        <Pressable 
          key={event.id} 
          style={styles.cardContainer}
          onPress={() => handleEventClick(event.id)}
        >
          {/* Blurred Background Image */}
          <Image
            source={{ uri: event.imageUrl }}
            style={styles.cardBackgroundImage}
            resizeMode="cover"
            blurRadius={3}
          />
          <View style={styles.cardOverlay} />

          {/* Card Content */}
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{event.title}</Text>
            
            {/* Make organizer name clickable */}
            <Pressable onPress={(e) => {
              e.stopPropagation();
              handleOrganizerClick(event.organizer.name);
            }}>
              <Text style={styles.cardOrganizer}>{`by ${event.organizer.name}`}</Text>
            </Pressable>
            
            <View style={styles.cardDetails}>
              <Text style={styles.cardDetailText}>
                {`${event.date} • ${event.time}`}
              </Text>
              <Text style={styles.cardDetailText}>{event.location}</Text>
              <Text style={styles.cardDetailText}>
                {`${event.attendees}/${event.maxAttendees} people`}
              </Text>
            </View>

            <View style={styles.cardTags}>
              {event.tags?.slice(0, 3).map((tag, tagIndex) => (
                <View key={tagIndex} style={styles.cardTag}>
                  <Text style={styles.cardTagText}>{tag}</Text>
                </View>
              ))}
            </View>

            <View style={styles.cardButtons}>
              <TouchableOpacity 
                style={styles.cardFavoriteBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  // Handle favorite action
                }}
              >
                <Text style={styles.cardBtnText}>Favorite</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.cardJoinBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  handleEventClick(event.id);
                }}
              >
                <Text style={styles.cardBtnText}>Join</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    color: '#000',
    fontSize: 16,
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  emptyText: {
    color: '#000',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 16,
  },
  cardsScroll: {
    flex: 1,
  },
  cardsContent: {
    padding: 16,
    paddingBottom: 150,
  },
  cardContainer: {
    height: SCREEN_HEIGHT * 0.6,
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  cardBackgroundImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  cardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  cardContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'flex-end',
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  cardOrganizer: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cardDetails: {
    marginBottom: 12,
  },
  cardDetailText: {
    color: '#fff',
    fontSize: 13,
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cardTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  cardTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  cardTagText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  cardButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cardFavoriteBtn: {
    flex: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cardJoinBtn: {
    flex: 1,
    backgroundColor: 'rgba(34, 197, 94, 0.9)',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cardBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
