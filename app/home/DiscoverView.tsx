import React, { useEffect, useRef, useState } from 'react';
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
  Alert,
} from 'react-native';
import { useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { dataService, authService } from '../../Backend/firebase';
import { Event } from '../../lib/types';
import { mockEvents } from '../../lib/events';

interface DiscoverViewProps {
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
}

export default function DiscoverView({ currentIndex, setCurrentIndex }: DiscoverViewProps) {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const scrollViewRef = useRef<ScrollView>(null);
  const autoScrollTimer = useRef<any>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check authentication status
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

  // Fetch events on mount - combine database and demo events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const fetchedEvents = await dataService.getEvents({ limit: 10 });
        // Combine database events with demo events, avoiding duplicates by ID
        const dbEventIds = new Set(fetchedEvents.map(e => e.id.toString()));
        const demoEventsFiltered = mockEvents.filter(e => !dbEventIds.has(e.id.toString()));
        const combinedEvents = [...fetchedEvents, ...demoEventsFiltered].slice(0, 15); // Limit total
        setEvents(combinedEvents as Event[]);
      } catch (error) {
        console.error('Error fetching events:', error);
        // Fallback to demo events if database fails
        setEvents(mockEvents.slice(0, 10));
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Auto-scroll every 7 seconds
  useEffect(() => {
    if (events.length === 0 || !isAutoScrolling) {
      if (autoScrollTimer.current) {
        clearInterval(autoScrollTimer.current);
      }
      return;
    }

    autoScrollTimer.current = setInterval(() => {
      const nextIndex = (currentIndex + 1) % events.length;
      setCurrentIndex(nextIndex);
      scrollViewRef.current?.scrollTo({
        y: nextIndex * SCREEN_HEIGHT,
        animated: true,
      });
    }, 7000);

    return () => {
      if (autoScrollTimer.current) {
        clearInterval(autoScrollTimer.current);
      }
    };
  }, [currentIndex, events.length, isAutoScrolling]);

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / SCREEN_HEIGHT);
    if (index !== currentIndex && index >= 0 && index < events.length) {
      setCurrentIndex(index);
    }
  };

  const handleEventClick = (eventId: number | string) => {
    if (!isLoggedIn) {
      Alert.alert(
        'Login Required',
        'Please sign in to view event details and join events.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/login') }
        ]
      );
      return;
    }

    router.push({
      pathname: '../activity_detail',
      params: { eventId: eventId.toString() }
    });
  };

  const handleFavorite = (eventId: number | string) => {
    if (!isLoggedIn) {
      Alert.alert(
        'Login Required',
        'Please sign in to add events to your favorites.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/login') }
        ]
      );
      return;
    }

    // TODO: Implement favorite functionality
    Alert.alert('Success', 'Event added to favorites!');
  };

  const handleOrganizerClick = (organizerName: string) => {
    router.push({
      pathname: '../organizer_info',
      params: { organizerName }
    });
  };

  const currentEvent = events[currentIndex];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
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
    <View style={styles.container}>
      {/* Main Content */}
      <ScrollView
        ref={scrollViewRef}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        style={styles.scrollView}
      >
        {events.map((event, index) => (
          <View key={event.id} style={[styles.eventContainer, { width: SCREEN_WIDTH, height: SCREEN_HEIGHT }]}>
            {/* Background Image */}
            <Image
              source={{ uri: event.imageUrl }}
              style={styles.backgroundImage}
              resizeMode="cover"
            />
            <View style={styles.overlay} />

            {/* Content Overlay */}
            <View style={styles.content}>
              {/* Top Info */}
              <View style={styles.topInfo}>
                <Pressable onPress={() => handleEventClick(event.id)}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                </Pressable>

                <Pressable
                  onPress={() => handleOrganizerClick(event.organizer.name)}
                  style={styles.organizerContainer}
                >
                  <View style={styles.organizerAvatar}>
                    <Text style={styles.organizerAvatarText}>{event.organizer.avatar}</Text>
                  </View>
                  <View style={styles.organizerTextContainer}>
                    <Text style={styles.organizerName}>{event.organizer.name}</Text>
                    <Text style={styles.organizerLabel}>Organizer</Text>
                  </View>
                </Pressable>
              </View>

              {/* Middle - Description */}
              <View style={styles.middleContent}>
                <Text style={styles.description}>
                  {event.description || 'Join us for an amazing experience! 🎉'}
                </Text>

                {!isMuted && (
                  <Text style={styles.musicTitle}>
                    🎵 Ambient Vibes
                  </Text>
                )}
              </View>

              {/* Bottom Info and Actions */}
              <View style={styles.bottomContent}>
                {/* Event Details */}
                <View style={styles.detailsCard}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>🕐</Text>
                    <Text style={styles.detailText}>
                      {event.date} • {event.time}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>📍</Text>
                    <Text style={styles.detailText}>{event.location}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>👥</Text>
                    <Text style={styles.detailText}>
                      {event.attendees}/{event.maxAttendees} people
                    </Text>
                    {event.cost && event.cost > 0 && (
                      <Text style={styles.costText}>${event.cost}</Text>
                    )}
                  </View>

                  {/* Tags */}
                  <View style={styles.tagsContainer}>
                    {event.tags?.slice(0, 3).map((tag: string, tagIndex: number) => (
                      <View key={tagIndex} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.favoriteButton, !isLoggedIn && styles.buttonDisabled]}
                    onPress={() => handleFavorite(event.id)}
                  >
                    <Text style={styles.buttonIcon}>❤️</Text>
                    <Text style={styles.buttonText}>Favorite</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.joinButton, !isLoggedIn && styles.buttonDisabled]}
                    onPress={() => handleEventClick(event.id)}
                  >
                    <Text style={styles.buttonIcon}>✓</Text>
                    <Text style={styles.buttonText}>{isLoggedIn ? 'Join' : 'Sign In to Join'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Top Right Controls */}
      <View style={styles.topRightControls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => setIsMuted(!isMuted)}
        >
          <Text style={styles.controlIcon}>{isMuted ? '🔇' : '🔊'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => setIsAutoScrolling(!isAutoScrolling)}
        >
          <Text style={styles.controlIcon}>{isAutoScrolling ? '⏸️' : '▶️'}</Text>
        </TouchableOpacity>
      </View>

      {/* Right Side Scroll Indicators */}
      <View style={styles.rightControls}>
        <View style={styles.scrollIndicator}>
          {events.map((_, indicatorIndex) => (
            <TouchableOpacity
              key={indicatorIndex}
              style={[
                styles.indicator,
                indicatorIndex === currentIndex && styles.activeIndicator,
              ]}
              onPress={() => {
                setCurrentIndex(indicatorIndex);
                scrollViewRef.current?.scrollTo({
                  y: indicatorIndex * SCREEN_HEIGHT,
                  animated: true,
                });
              }}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 40,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 16,
    paddingTop: 0, 
  },
  headerControls: {
    flexDirection: 'row',
    gap: 12,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlIcon: {
    fontSize: 20,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  emptyText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#ccc',
    fontSize: 16,
  },
  eventContainer: {
    position: 'relative',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topInfo: {
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  eventTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  organizerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  organizerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  organizerAvatarText: {
    fontSize: 18,
  },
  organizerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  organizerTextContainer: {
    flex: 1,
  },
  organizerLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  musicTextInline: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  middleContent: {
    paddingHorizontal: 20,
    marginBottom: 'auto',
    marginTop: 80,
  },
  description: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 24,
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  musicTitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  musicInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  musicIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  musicText: {
    fontSize: 14,
    color: '#fff',
  },
  bottomContent: {
    paddingHorizontal: 20,
    paddingBottom: 50,
  },
  detailsCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailIcon: {
    fontSize: 16,
    marginRight: 8,
    width: 20,
    textAlign: 'center',
  },
  detailText: {
    fontSize: 14,
    color: '#fff',
    flex: 1,
  },
  costText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  tag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  tagText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  favoriteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  joinButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.9)',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  buttonDisabled: {
    backgroundColor: 'rgba(156, 163, 175, 0.6)',
  },
  buttonIcon: {
    fontSize: 18,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollIndicator: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -50 }],
    gap: 8,
    zIndex: 30,
  },
  indicator: {
    width: 4,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
  },
  rightControls: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -50 }],
    alignItems: 'center',
    zIndex: 30,
  },
  topRightControls: {
    position: 'absolute',
    top: 40,
    right: 16,
    flexDirection: 'row',
    gap: 12,
    zIndex: 40,
  },
  activeIndicator: {
    backgroundColor: '#fff',
  },
});
