import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { mockEvents } from '../../lib/events';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

interface DiscoverViewProps {
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
}

export default function DiscoverView({ currentIndex, setCurrentIndex }: DiscoverViewProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const autoScrollTimer = useRef<any>(null);

  // Auto-scroll every 7 seconds
  useEffect(() => {
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
    }

    autoScrollTimer.current = setInterval(() => {
      const nextIndex = (currentIndex + 1) % mockEvents.length;
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
  }, [currentIndex]);

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / SCREEN_HEIGHT);
    if (index !== currentIndex && index >= 0 && index < mockEvents.length) {
      setCurrentIndex(index);
    }
  };

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

  return (
    <ScrollView
      ref={scrollViewRef}
      pagingEnabled
      showsVerticalScrollIndicator={false}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      decelerationRate="fast"
    >
      {mockEvents.map((event, index) => (
        <View key={event.id} style={styles.eventContainer}>
          <Image
            source={{ uri: event.imageUrl }}
            style={styles.backgroundImage}
            resizeMode="cover"
          />
          <View style={styles.gradientOverlay} />

          {/* Event Content */}
          <View style={styles.discoverContent}>
            {/* Make title clickable */}
            <Pressable onPress={() => handleEventClick(event.id)}>
              <Text style={styles.eventTitle}>{event.title}</Text>
            </Pressable>

            {/* Make organizer name clickable */}
            <Pressable onPress={() => handleOrganizerClick(event.organizer.name)}>
              <Text style={styles.organizerName}>{`by ${event.organizer.name}`}</Text>
            </Pressable>

            <View style={styles.detailsCard}>
              <Text style={styles.detailText}>
                {`📅 ${event.date} ${event.time}`}
              </Text>
              <Text style={styles.detailText}>{`📍 ${event.location}`}</Text>
              <Text style={styles.detailText}>
                {`👥 ${event.attendees}/${event.maxAttendees} people`}
              </Text>
              {event.cost && event.cost > 0 && (
                <Text style={styles.costText}>{`$${event.cost}`}</Text>
              )}
            </View>

            <View style={styles.tagsContainer}>
              {event.tags?.slice(0, 3).map((tag, tagIndex) => (
                <View key={tagIndex} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.favoriteButton}>
                <Text style={styles.buttonText}>❤️ Favorite</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.joinButton}
                onPress={() => handleEventClick(event.id)}
              >
                <Text style={styles.buttonText}>✓ Join</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Scroll Indicator */}
          <View style={styles.scrollIndicator}>
            {mockEvents.map((_, indicatorIndex) => (
              <View
                key={indicatorIndex}
                style={[
                  styles.indicator,
                  indicatorIndex === index && styles.activeIndicator,
                ]}
              />
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  eventContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: 'relative',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  discoverContent: {
    position: 'absolute',
    bottom: 150,
    left: 20,
    right: 20,
  },
  eventTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  organizerName: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  detailsCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  detailText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 6,
  },
  costText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  tagText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  favoriteButton: {
    flex: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  joinButton: {
    flex: 1,
    backgroundColor: 'rgba(34, 197, 94, 0.9)',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
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
    gap: 8,
  },
  indicator: {
    width: 4,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
  },
  activeIndicator: {
    backgroundColor: '#fff',
  },
});
