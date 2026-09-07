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
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { dataService } from '../../Backend/firebase';
import { useAuth } from '../../lib/auth';
import { formatEventDateLabel, formatEventTimeRange } from '../../lib/eventTime';
import EventFilterBar from '../EventFilterBar';
import { applyFilters, emptyFilters, isFilterActive, type EventFilters } from '../../lib/eventFilters';
import { useNearby } from '../../lib/useNearby';
import { byDistanceFrom, distanceToEvent, formatDistance } from '../../lib/geo';
import { Event } from '../../lib/types';
import { getCachedEventFeed, preloadEventFeed } from '../../lib/eventFeed';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CardsViewProps {
  viewMode: 'discover' | 'cards' | 'map';
  setViewMode: (mode: 'discover' | 'cards' | 'map') => void;
}

export default function CardsView({ viewMode, setViewMode }: CardsViewProps) {
  const initialEvents = getCachedEventFeed()?.slice(0, 25) ?? [];
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [filters, setFilters] = useState<EventFilters>(emptyFilters);
  const nearby = useNearby();
  const [loading, setLoading] = useState(initialEvents.length === 0);
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const hydrateUserState = async () => {
      try {
        const [favorites, commitments] = await Promise.all([
          dataService.getUserFavorites(),
          dataService.getUserCommitments(),
        ]);
        setFavoriteIds(new Set(favorites.map((id) => id.toString())));
        setJoinedIds(
          new Set(
            commitments
              .filter((c) => c.status !== 'declined')
              .map((c) => String(c.eventId))
          )
        );
      } catch {
        setFavoriteIds(new Set());
        setJoinedIds(new Set());
      }
    };

    if (user) {
      hydrateUserState();
    } else {
      setFavoriteIds(new Set());
      setJoinedIds(new Set());
    }
  }, [user]);

  useEffect(() => {
    const cachedEvents = getCachedEventFeed();
    if (cachedEvents?.length) {
      setEvents(cachedEvents.slice(0, 25));
      setLoading(false);
    }

    let isMounted = true;

    const fetchEvents = async () => {
      try {
        const combinedEvents = await preloadEventFeed({ limit: 30, maxItems: 30 });
        if (isMounted) {
          setEvents(combinedEvents.slice(0, 25));
        }
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchEvents();

    return () => {
      isMounted = false;
    };
  }, []);

  const requireLogin = (message: string) => {
    if (Platform.OS === 'web') {
      router.push('/login');
      return;
    }
    Alert.alert('Login Required', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign In', onPress: () => router.push('/login') },
    ]);
  };

  const handleEventClick = (eventId: number | string) => {
    if (!isLoggedIn) {
      requireLogin('Sign in to view event details and interact with events.');
      return;
    }

    router.push({
      pathname: '/activity_detail',
      params: { eventId: eventId.toString() }
    });
  };

  const handleOrganizerClick = (organizerName: string, organizerUid?: string) => {
    if (!isLoggedIn) {
      requireLogin('Sign in to view organizer profiles and send messages.');
      return;
    }

    router.push({
      pathname: '/organizer_info',
      params: { organizerName, organizerUid: organizerUid || '' }
    });
  };

  const handleFavorite = async (eventId: string | number) => {
    if (!isLoggedIn) {
      requireLogin('Please sign in to add events to favorites.');
      return;
    }

    const id = eventId.toString();
    try {
      if (favoriteIds.has(id)) {
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
    } catch {
      Alert.alert('Error', 'Failed to update favorites.');
    }
  };

  const handleJoin = async (event: Event) => {
    if (!isLoggedIn) {
      requireLogin('Please sign in to join events.');
      return;
    }

    const id = event.id.toString();
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
              ? 'This event is full. You were added to the waitlist.'
              : 'Your join request is pending organizer approval.'
          );
        }
      }
    } catch {
      Alert.alert('Error', 'Failed to join this event.');
    }
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

  // Once the viewer's location is known, nearest first is a more useful
  // default order than soonest — they are already filtering by date if timing
  // is what matters to them.
  const visibleEvents = nearby.coords
    ? [...applyFilters(events, filters)].sort(byDistanceFrom(nearby.coords))
    : applyFilters(events, filters);

  return (
    <View style={{ flex: 1 }}>
      {/* Top Right View Selector */}
      <View style={styles.topRightControls}>
        <View style={styles.viewSelectorContainer}>
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

      <EventFilterBar
        events={events}
        filters={filters}
        onChange={setFilters}
        resultCount={visibleEvents.length}
      />

      <ScrollView
        style={styles.cardsScroll}
        contentContainerStyle={styles.cardsContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {visibleEvents.length === 0 && (
          <View style={styles.emptyResults}>
            <Text style={styles.emptyResultsTitle}>
              {isFilterActive(filters) ? 'Nothing matches those filters' : 'No events yet'}
            </Text>
            <Text style={styles.emptyResultsBody}>
              {isFilterActive(filters)
                ? 'Try widening the date range or clearing a tag.'
                : 'Be the first to create one.'}
            </Text>
            {isFilterActive(filters) && (
              <Pressable onPress={() => setFilters(emptyFilters)} style={styles.emptyResultsBtn}>
                <Text style={styles.emptyResultsBtnText}>Clear filters</Text>
              </Pressable>
            )}
          </View>
        )}

        {visibleEvents.map((event) => (
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
              handleOrganizerClick(event.organizer.name, event.organizer.uid);
            }}>
              <Text style={styles.cardOrganizer}>{`by ${event.organizer.name}`}</Text>
            </Pressable>
            
            <View style={styles.cardDetails}>
              <Text style={styles.cardDetailText}>
                {`${formatEventDateLabel(event)} • ${formatEventTimeRange(event)}`}
              </Text>
              <Text style={styles.cardDetailText}>
                {event.location}
                {(() => {
                  const km = distanceToEvent(nearby.coords, event);
                  return km === null ? '' : ` · ${formatDistance(km)}`;
                })()}
              </Text>
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
                style={[styles.cardFavoriteBtn, !isLoggedIn && styles.cardButtonDisabled]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleFavorite(event.id);
                }}
              >
                <Text style={styles.cardBtnText}>
                  {favoriteIds.has(event.id.toString()) ? 'Favorited' : 'Favorite'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.cardJoinBtn, !isLoggedIn && styles.cardButtonDisabled]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleJoin(event);
                }}
              >
                <Text style={styles.cardBtnText}>
                  {!isLoggedIn
                    ? 'Sign In'
                    : joinedIds.has(event.id.toString())
                    ? 'Joined'
                    : event.requiresApproval
                    ? 'Request'
                    : 'Join'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
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
    // The filter bar now occupies the space the selector used to need.
    paddingTop: 8,
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
  cardButtonDisabled: {
    backgroundColor: 'rgba(156, 163, 175, 0.8)',
  },
  emptyResults: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyResultsTitle: { fontSize: 16, fontWeight: '700', color: '#fff', textAlign: 'center' },
  emptyResultsBody: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
    marginTop: 6,
  },
  emptyResultsBtn: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  emptyResultsBtnText: { fontSize: 13, fontWeight: '700', color: '#111827' },

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
