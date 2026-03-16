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
  Animated,
} from 'react-native';
import { useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { dataService, authService } from '../../Backend/firebase';
import { Event } from '../../lib/types';
import { mockEvents } from '../../lib/events';

interface DiscoverViewProps {
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  viewMode: 'discover' | 'cards' | 'map';
  setViewMode: (mode: 'discover' | 'cards' | 'map') => void;
}

export default function DiscoverView({ currentIndex, setCurrentIndex, viewMode, setViewMode }: DiscoverViewProps) {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const scrollViewRef = useRef<ScrollView>(null);
  const autoScrollTimer = useRef<any>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [showConfetti, setShowConfetti] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const confettiAnimation = useRef(new Animated.Value(0)).current;
  const heartAnimation = useRef(new Animated.Value(0)).current;

  // Check authentication status
  useEffect(() => {
    const loadUserInteractionState = async () => {
      try {
        const [favorites, commitments] = await Promise.all([
          dataService.getUserFavorites(),
          dataService.getUserCommitments(),
        ]);

        setFavoriteIds(new Set(favorites.map((id) => id.toString())));
        setJoinedIds(new Set(commitments.map((commitment: any) => commitment.eventId.toString())));
      } catch {
        setFavoriteIds(new Set());
        setJoinedIds(new Set());
      }
    };

    const checkAuth = () => {
      const user = authService.getCurrentUser();
      setIsLoggedIn(!!user);
      if (user) {
        loadUserInteractionState();
      } else {
        setFavoriteIds(new Set());
        setJoinedIds(new Set());
      }
    };

    checkAuth();
    
    // Listen for auth state changes
    const unsubscribe = authService.onAuthStateChange((user) => {
      setIsLoggedIn(!!user);
      if (user) {
        loadUserInteractionState();
      } else {
        setFavoriteIds(new Set());
        setJoinedIds(new Set());
      }
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
        const combinedEvents = [...fetchedEvents, ...demoEventsFiltered]
          .slice(0, 15)
          .map((event: any) => ({
            ...event,
            organizer: {
              uid: event.organizer?.uid || event.createdBy,
              name: event.organizer?.name || 'Unknown Organizer',
              avatar: event.organizer?.avatar || '👤',
              photoURL: event.organizer?.photoURL || null,
            },
            imageUrl:
              event.imageUrl ||
              'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=400&h=800&fit=crop',
          }));

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
        'Sign in to view event details and interact with events.',
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

  const handleFavorite = async (eventId: number | string) => {
    const id = eventId.toString();

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

    try {
      const isAlreadyFavorite = favoriteIds.has(id);

      if (isAlreadyFavorite) {
        await dataService.removeFromFavorites(id);
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } else {
        await dataService.addToFavorites(id);
        setFavoriteIds((prev) => new Set(prev).add(id));
      }

      // Show heart animation
      setShowHeart(true);
      heartAnimation.setValue(0);
      Animated.sequence([
        Animated.spring(heartAnimation, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 3,
        }),
        Animated.timing(heartAnimation, {
          toValue: 0,
          duration: 300,
          delay: 800,
          useNativeDriver: true,
        }),
      ]).start(() => setShowHeart(false));
    } catch (error) {
      console.error('Error adding to favorites:', error);
      Alert.alert('Error', 'Failed to add event to favorites. Please try again.');
    }
  };

  const handleJoinEvent = async (eventId: number | string) => {
    const id = eventId.toString();

    if (!isLoggedIn) {
      Alert.alert(
        'Login Required',
        'Please sign in to join events.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/login') }
        ]
      );
      return;
    }

    try {
      if (joinedIds.has(id)) {
        await dataService.cancelCommitment(id);
        setJoinedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } else {
        const result = await dataService.commitToEvent(id);
        setJoinedIds((prev) => new Set(prev).add(id));

        if (result.status === 'pending') {
          Alert.alert(
            'Request Sent',
            result.reason === 'waitlist'
              ? 'This event is full. You have been added to the waitlist.'
              : 'Your join request is pending organizer approval.'
          );
        }
      }

      // Show confetti animation
      setShowConfetti(true);
      confettiAnimation.setValue(0);
      Animated.timing(confettiAnimation, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      }).start(() => setShowConfetti(false));
    } catch (error) {
      console.error('Error joining event:', error);
      Alert.alert('Error', 'Failed to join event. Please try again.');
    }
  };

  const handleOrganizerClick = (organizerName: string, organizerUid?: string) => {
    if (!isLoggedIn) {
      Alert.alert(
        'Login Required',
        'Sign in to view organizer profiles and send messages.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/login') }
        ]
      );
      return;
    }

    router.push({
      pathname: '../organizer_info',
      params: { organizerName, organizerUid: organizerUid || '' }
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
                    onPress={() => handleOrganizerClick(event.organizer.name, event.organizer.uid)}
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
                    <Text style={styles.buttonText}>
                      {favoriteIds.has(event.id.toString()) ? 'Favorited' : 'Favorite'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.joinButton, !isLoggedIn && styles.buttonDisabled]}
                    onPress={() => handleJoinEvent(event.id)}
                  >
                    <Text style={styles.buttonIcon}>✓</Text>
                    <Text style={styles.buttonText}>
                      {!isLoggedIn
                        ? 'Sign In to Join'
                        : joinedIds.has(event.id.toString())
                        ? 'Joined'
                        : event.requiresApproval
                        ? 'Request'
                        : 'Join'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Top Right Controls */}
      <View style={styles.topRightControls}>
        {/* Pause/Play Button */}
        <TouchableOpacity
          style={styles.smallControlButton}
          onPress={() => setIsAutoScrolling(!isAutoScrolling)}
        >
          <Text style={styles.smallControlIcon}>{isAutoScrolling ? '⏸' : '▶'}</Text>
        </TouchableOpacity>

        {/* Music Toggle Button */}
        <TouchableOpacity
          style={styles.smallControlButton}
          onPress={() => setIsMuted(!isMuted)}
        >
          <Text style={styles.smallControlIcon}>{isMuted ? '🔇' : '🎵'}</Text>
        </TouchableOpacity>

        {/* View Selector with Water Droplet Effect */}
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

      {/* Confetti Animation */}
      {showConfetti && (
        <View style={styles.animationContainer}>
          {[...Array(30)].map((_, i) => {
            const randomX = Math.random() * SCREEN_WIDTH;
            const randomDelay = Math.random() * 200;
            const randomColor = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'][Math.floor(Math.random() * 6)];
            
            return (
              <Animated.View
                key={i}
                style={[
                  styles.confetti,
                  {
                    backgroundColor: randomColor,
                    left: randomX,
                    transform: [
                      {
                        translateY: confettiAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [SCREEN_HEIGHT, -100],
                        }),
                      },
                      {
                        rotate: confettiAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '720deg'],
                        }),
                      },
                    ],
                    opacity: confettiAnimation.interpolate({
                      inputRange: [0, 0.8, 1],
                      outputRange: [1, 1, 0],
                    }),
                  },
                ]}
              />
            );
          })}
        </View>
      )}

      {/* Heart Animation */}
      {showHeart && (
        <Animated.View
          style={[
            styles.heartContainer,
            {
              transform: [
                {
                  scale: heartAnimation.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, 1.2, 1],
                  }),
                },
              ],
              opacity: heartAnimation,
            },
          ]}
        >
          <Text style={styles.heartEmoji}>❤️</Text>
        </Animated.View>
      )}
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
    paddingRight: 90, // Space for top right controls
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
    marginBottom: 16,
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
    paddingRight: 90, // Space for side buttons
    marginBottom: 'auto',
    marginTop: 20,
  },
  description: {
    fontSize: 15,
    color: '#fff',
    lineHeight: 22,
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
    paddingBottom: 100, // More space above navigation
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
    top: 60,
    right: 16,
    flexDirection: 'column',
    gap: 10,
    zIndex: 40,
  },
  smallControlButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  smallControlIcon: {
    fontSize: 16,
  },
  viewSelectorContainer: {
    marginTop: 8,
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
  animationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 1000,
  },
  confetti: {
    position: 'absolute',
    width: 10,
    height: 10,
    bottom: 0,
  },
  heartContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -50,
    marginTop: -50,
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    pointerEvents: 'none',
  },
  heartEmoji: {
    fontSize: 80,
  },
  activeIndicator: {
    backgroundColor: '#fff',
  },
});
