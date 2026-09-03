import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import FloatingNavigation from '../components/FloatingNavigation';
import { dataService, type UserProfile } from '../Backend/firebase';
import { useAuth } from '../lib/auth';
import EventScheduleField, {
  defaultSchedule,
  toDateKey,
  type EventSchedule,
} from '../components/EventScheduleField';
import { combineDateAndTime, getEventStart } from '../lib/eventTime';
import { upsertCachedEvent, invalidateEventFeedCache } from '../lib/eventFeed';
import * as ImagePicker from 'expo-image-picker';
import type { Event, EventMedia, EventMusic } from '../lib/types';

export default function CreateEventScreen() {
  // The same form serves create and edit. Passing ?eventId= switches it into
  // edit mode rather than maintaining a second 800-line copy of this screen.
  const params = useLocalSearchParams();
  const editingEventId = String(params.eventId || '');
  const isEditing = !!editingEventId;

  const { user, profile: authProfile, initializing, loadingProfile } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<{
    title: string;
    type: string;
    timeFlexible: boolean;
    location: string;
    minPeople: string;
    maxPeople: string;
    openToAll: boolean;
    cost: string;
    description: string;
    tags: string[];
    musicTitle: string;
    musicArtist: string;
    musicStartAt: string;
    media: EventMedia[];
  }>({
    title: '',
    type: '',
    timeFlexible: false,
    location: '',
    minPeople: '',
    maxPeople: '',
    openToAll: true,
    cost: '',
    description: '',
    tags: [],
    musicTitle: '',
    musicArtist: '',
    musicStartAt: '',
    media: [],
  });

  const [newTag, setNewTag] = useState('');
  const [schedule, setSchedule] = useState<EventSchedule>(defaultSchedule);
  const [submitting, setSubmitting] = useState(false);
  const [loadedEvent, setLoadedEvent] = useState<any | null>(null);

  // Waits for the auth provider to settle before deciding the user is signed
  // out — a synchronous currentUser read is null during web session restore.
  useEffect(() => {
    if (initializing) return;

    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to continue.', [
        { text: 'OK', onPress: () => router.replace('/login') },
      ]);
      setLoading(false);
      return;
    }

    if (authProfile) {
      setUserProfile(authProfile);
      setLoading(false);
      return;
    }

    if (!loadingProfile) {
      // Provider finished without a profile: fall back to the auth identity so
      // creation is still possible rather than dead-ending the user.
      setUserProfile({
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'User',
        photoURL: user.photoURL || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      setLoading(false);
    }
  }, [initializing, user, authProfile, loadingProfile]);

  // In edit mode, hydrate the form from the stored event.
  useEffect(() => {
    if (!isEditing || !user) return;

    let active = true;
    (async () => {
      try {
        const event: any = await dataService.getEvent(editingEventId);
        if (!active) return;

        if (!event) {
          Alert.alert('Not found', 'That event no longer exists.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
          return;
        }
        if (event.createdBy !== user.uid) {
          Alert.alert('Not allowed', 'Only the organizer can edit this event.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
          return;
        }

        setLoadedEvent(event);
        setFormData({
          title: event.title || '',
          type: event.type || '',
          timeFlexible: !!event.timeFlexible,
          location: event.location || '',
          minPeople: event.minAttendees ? String(event.minAttendees) : '',
          maxPeople: event.maxAttendees ? String(event.maxAttendees) : '',
          openToAll: !event.requiresApproval,
          cost: event.cost ? String(event.cost) : '',
          description: event.description || '',
          tags: event.tags || [],
          musicTitle: event.music?.title || '',
          musicArtist: event.music?.artist || '',
          musicStartAt:
            event.music?.startAtSeconds !== undefined ? String(event.music.startAtSeconds) : '',
          media: event.media || [],
        });

        const start = getEventStart(event);
        if (start) {
          setSchedule({
            date: toDateKey(start),
            time: `${String(start.getHours()).padStart(2, '0')}:${String(
              start.getMinutes()
            ).padStart(2, '0')}`,
            durationMinutes: Number(event.durationMinutes) || 120,
          });
        }
      } catch {
        Alert.alert('Error', 'Could not load that event.');
      }
    })();

    return () => {
      active = false;
    };
  }, [isEditing, editingEventId, user]);

  const activityTypes = [
    'Sports',
    'Arts & Culture',
    'Food & Drink',
    'Health & Wellness',
    'Education',
    'Technology',
    'Outdoor',
    'Social',
    'Music',
    'Other',
  ];

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const pickMediaFromDevice = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please allow media library access to add photos/videos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: false,
        allowsMultipleSelection: true,
        quality: 0.9,
        selectionLimit: 5,
      });

      if (result.canceled) return;

      const selectedMedia: EventMedia[] = result.assets.map((asset) => ({
        uri: asset.uri,
        type: asset.type === 'video' ? 'video' : 'image',
        width: asset.width,
        height: asset.height,
        durationMs: asset.duration ?? undefined,
      }));

      setFormData((prev) => ({
        ...prev,
        media: [...prev.media, ...selectedMedia].slice(0, 6),
      }));
    } catch (error) {
      console.error('Error selecting media:', error);
      Alert.alert('Error', 'Could not access media library right now.');
    }
  };

  const removeMedia = (uri: string) => {
    setFormData((prev) => ({
      ...prev,
      media: prev.media.filter((item) => item.uri !== uri),
    }));
  };

  const handleSubmit = async () => {
    const currentUser = user;
    if (!currentUser) {
      Alert.alert('Authentication Required', 'Please sign in to create an event.', [
        { text: 'OK', onPress: () => router.replace('/login') },
      ]);
      return;
    }

    if (!userProfile) {
      Alert.alert('Error', 'Unable to create event. Please try again.');
      return;
    }

    if (formData.tags.length < 3) {
      Alert.alert('Error', 'Please add at least 3 tags');
      return;
    }

    if (!formData.title || !formData.description || !formData.location || !formData.type) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const startsAt = combineDateAndTime(schedule.date, schedule.time);
    if (!startsAt) {
      Alert.alert('Invalid date', 'Please pick a valid date and start time.');
      return;
    }

    if (startsAt.getTime() < Date.now() - 60 * 1000) {
      Alert.alert('Date in the past', 'Pick a start time in the future so people can still join.');
      return;
    }

    const minCapacity = parseInt(formData.minPeople, 10);
    const maxCapacity = parseInt(formData.maxPeople, 10);

    if (
      isEditing &&
      Number.isFinite(maxCapacity) &&
      maxCapacity < Number(loadedEvent?.attendees || 0)
    ) {
      Alert.alert(
        'Capacity too low',
        `${loadedEvent.attendees} people already have a confirmed place. Set the maximum to at least that.`
      );
      return;
    }
    if (
      Number.isFinite(minCapacity) &&
      Number.isFinite(maxCapacity) &&
      minCapacity > maxCapacity
    ) {
      Alert.alert('Check capacity', 'The minimum number of people cannot exceed the maximum.');
      return;
    }

    setSubmitting(true);
    try {
      const parsedCost = formData.cost ? parseFloat(formData.cost.replace('$', '')) || 0 : 0;
      const maxAttendees = parseInt(formData.maxPeople) || undefined;
      const minAttendees = parseInt(formData.minPeople) || undefined;
      const parsedMusicStartAt = parseFloat(formData.musicStartAt);
      const eventMusic: EventMusic | undefined = formData.musicTitle.trim()
        ? {
            title: formData.musicTitle.trim(),
            artist: formData.musicArtist.trim() || undefined,
            startAtSeconds:
              Number.isFinite(parsedMusicStartAt) && parsedMusicStartAt >= 0
                ? parsedMusicStartAt
                : undefined,
          }
        : undefined;

      const primaryImageFromMedia = formData.media.find((item) => item.type === 'image')?.uri;

      const eventData = {
        title: formData.title,
        type: formData.type,
        description: formData.description,
        location: formData.location,
        // Authoritative schedule. `date`/`time` are also written as readable
        // strings so anything still reading the legacy fields keeps working.
        startsAt: startsAt.toISOString(),
        durationMinutes: schedule.durationMinutes,
        date: startsAt.toLocaleDateString(),
        time: startsAt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
        timeFlexible: formData.timeFlexible,
        tags: formData.tags,
        cost: parsedCost,
        requiresApproval: !formData.openToAll,
        maxAttendees,
        minAttendees,
        music: eventMusic,
        media: formData.media,
        attendees: 0,
        organizer: { 
          uid: currentUser.uid,
          name:
            userProfile.displayName ||
            currentUser.displayName ||
            currentUser.email ||
            'User',
          avatar: '👤',
          photoURL: userProfile.photoURL,
        },
        imageUrl:
          primaryImageFromMedia ||
          'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=800&fit=crop', // Default image
      };

      if (isEditing) {
        // Capacity and organizer identity are not editable here: lowering
        // capacity below the number already confirmed would silently invalidate
        // people's places, which needs its own flow.
        await dataService.updateEvent(editingEventId, eventData);
        invalidateEventFeedCache();

        Alert.alert('Changes saved', 'Your event has been updated.', [
          {
            text: 'OK',
            onPress: () =>
              router.replace({
                pathname: '/activity_detail',
                params: { eventId: editingEventId },
              }),
          },
        ]);
        return;
      }

      const eventId = await dataService.createEvent(eventData);

      const createdEvent: Event = {
        ...eventData,
        id: eventId,
      };
      upsertCachedEvent(createdEvent, { maxItems: 60 });

      Alert.alert('Event created', 'Your event is now live in Discover.', [
        {
          text: 'View it',
          onPress: () => router.replace({ pathname: '/activity_detail', params: { eventId } }),
        },
        { text: 'Done', onPress: () => router.replace('/home') },
      ]);
    } catch (error: any) {
      console.error(isEditing ? 'Error updating event:' : 'Error creating event:', error);
      Alert.alert(
        'Error',
        error?.message || `Failed to ${isEditing ? 'update' : 'create'} the event. Please try again.`
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  if (!userProfile) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.headerButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Event' : 'Create Event'}</Text>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={formData.tags.length < 3 || submitting}
          style={
            formData.tags.length >= 3 && !submitting
              ? styles.createButtonEnabled
              : styles.createButtonDisabled
          }
        >
          <Text
            style={
              formData.tags.length >= 3 && !submitting
                ? styles.createTextEnabled
                : styles.createTextDisabled
            }
          >
            {submitting ? 'Saving…' : isEditing ? 'Save' : 'Create'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Form */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.introCard}>
          <Text style={styles.introTitle}>
            {isEditing ? 'Update your event' : 'Design your event experience'}
          </Text>
          <Text style={styles.introSubtitle}>
            {isEditing
              ? 'Anyone who has already joined keeps their place. They are not notified of edits, so message them if the change matters.'
              : 'Add key details, soundtrack, and media to make your activity stand out.'}
          </Text>
        </View>

        {/* Activity Title */}
        <View style={styles.formCard}>
          <Text style={styles.label}>Activity Title *</Text>
          <TextInput
            style={styles.input}
            value={formData.title}
            onChangeText={(value) => handleInputChange('title', value)}
            placeholder="Enter activity title"
            placeholderTextColor="#999"
          />
        </View>

        {/* Activity Type */}
        <View style={styles.formCard}>
          <Text style={styles.label}>Activity Type *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.typeContainer}>
              {activityTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeButton,
                    formData.type === type && styles.typeButtonSelected,
                  ]}
                  onPress={() => handleInputChange('type', type)}
                >
                  <Text
                    style={[
                      styles.typeText,
                      formData.type === type && styles.typeTextSelected,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* When */}
        <View style={styles.formCard}>
          <Text style={styles.label}>When *</Text>
          <EventScheduleField value={schedule} onChange={setSchedule} />
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Start time is flexible</Text>
            <Switch
              value={formData.timeFlexible}
              onValueChange={(value) => handleInputChange('timeFlexible', value)}
            />
          </View>
        </View>

        {/* Meeting Point */}
        <View style={styles.formCard}>
          <Text style={styles.label}>Meeting Point *</Text>
          <TextInput
            style={styles.input}
            value={formData.location}
            onChangeText={(value) => handleInputChange('location', value)}
            placeholder="Enter specific meeting point"
            placeholderTextColor="#999"
          />
          <Text style={styles.helperText}>
            Please provide a specific meeting point for attendees
          </Text>
        </View>

        {/* Number of People */}
        <View style={styles.formCard}>
          <Text style={styles.label}>Number of People *</Text>
          <View style={styles.row}>
            <View style={styles.flex1}>
              <TextInput
                style={styles.input}
                value={formData.minPeople}
                onChangeText={(value) => handleInputChange('minPeople', value)}
                placeholder="Min"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.spacer} />
            <View style={styles.flex1}>
              <TextInput
                style={styles.input}
                value={formData.maxPeople}
                onChangeText={(value) => handleInputChange('maxPeople', value)}
                placeholder="Max"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        {/* Access Type */}
        <View style={styles.formCard}>
          <Text style={styles.label}>Access *</Text>
          <TouchableOpacity
            style={styles.radioRow}
            onPress={() => handleInputChange('openToAll', true)}
          >
            <View style={styles.radio}>
              {formData.openToAll && <View style={styles.radioSelected} />}
            </View>
            <Text style={styles.radioLabel}>Open to all</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.radioRow}
            onPress={() => handleInputChange('openToAll', false)}
          >
            <View style={styles.radio}>
              {!formData.openToAll && <View style={styles.radioSelected} />}
            </View>
            <Text style={styles.radioLabel}>Requires approval from organizer</Text>
          </TouchableOpacity>
        </View>

        {/* Tags */}
        <View style={styles.formCard}>
          <Text style={styles.label}>Tags * (minimum 3)</Text>
          <View style={styles.row}>
            <View style={styles.flex1}>
              <TextInput
                style={styles.input}
                value={newTag}
                onChangeText={setNewTag}
                placeholder="Add a tag"
                placeholderTextColor="#999"
                onSubmitEditing={addTag}
              />
            </View>
            <View style={styles.spacer} />
            <TouchableOpacity style={styles.addButton} onPress={addTag}>
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.tagsContainer}>
            {formData.tags.map((tag, index) => (
              <TouchableOpacity
                key={index}
                style={styles.tag}
                onPress={() => removeTag(tag)}
              >
                <Text style={styles.tagText}>{tag}</Text>
                <Text style={styles.tagRemove}> ×</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.helperText}>
            {formData.tags.length}/3 minimum tags added
          </Text>
        </View>

        {/* Cost */}
        <View style={styles.formCard}>
          <Text style={styles.label}>Cost</Text>
          <TextInput
            style={styles.input}
            value={formData.cost}
            onChangeText={(value) => handleInputChange('cost', value)}
            placeholder="Free or enter amount (e.g., $25)"
            placeholderTextColor="#999"
          />
        </View>

        {/* Description */}
        <View style={styles.formCard}>
          <Text style={styles.label}>Music (optional)</Text>
          <TextInput
            style={styles.input}
            value={formData.musicTitle}
            onChangeText={(value) => handleInputChange('musicTitle', value)}
            placeholder="Track title (e.g., Sunset Groove)"
            placeholderTextColor="#999"
          />
          <TextInput
            style={[styles.input, styles.inputSpacing]}
            value={formData.musicArtist}
            onChangeText={(value) => handleInputChange('musicArtist', value)}
            placeholder="Artist / source"
            placeholderTextColor="#999"
          />
          <TextInput
            style={[styles.input, styles.inputSpacing]}
            value={formData.musicStartAt}
            onChangeText={(value) => handleInputChange('musicStartAt', value)}
            placeholder="Start timestamp in seconds (e.g., 12.5)"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
          <Text style={styles.helperText}>
            You can connect this to a copyright-free music library later.
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>Media (photos / videos)</Text>
          <TouchableOpacity style={styles.mediaPickerButton} onPress={pickMediaFromDevice}>
            <Text style={styles.mediaPickerButtonText}>Choose from device</Text>
          </TouchableOpacity>

          {formData.media.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaPreviewRow}>
              {formData.media.map((item) => (
                <View key={item.uri} style={styles.mediaPreviewItem}>
                  <Image source={{ uri: item.uri }} style={styles.mediaPreviewImage} resizeMode="cover" />
                  <View style={styles.mediaBadge}>
                    <Text style={styles.mediaBadgeText}>{item.type === 'video' ? 'Video' : 'Photo'}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeMediaButton}
                    onPress={() => removeMedia(item.uri)}
                  >
                    <Text style={styles.removeMediaButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
          <Text style={styles.helperText}>{formData.media.length}/6 selected</Text>
        </View>

        {/* Description */}
        <View style={styles.formCard}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.description}
            onChangeText={(value) => handleInputChange('description', value)}
            placeholder="Describe your activity..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>
      
      {/* Floating Navigation */}
      <FloatingNavigation activeScreen="create" tone="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  headerButton: {
    fontSize: 16,
    color: '#000',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  createButtonEnabled: {
    backgroundColor: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonDisabled: {
    backgroundColor: '#ccc',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createTextEnabled: {
    color: '#fff',
    fontWeight: '600',
  },
  createTextDisabled: {
    color: '#666',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  introCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  introTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  introSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
  },
  formGroup: {
    marginBottom: 24,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#F9FAFB',
  },
  inputSpacing: {
    marginTop: 10,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  switchLabel: {
    fontSize: 14,
    color: '#666',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
  },
  flex1: {
    flex: 1,
  },
  spacer: {
    width: 12,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#000',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#000',
  },
  radioLabel: {
    fontSize: 14,
    color: '#000',
  },
  addButton: {
    width: 50,
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 24,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '600',
  },
  tagRemove: {
    color: '#6B7280',
    fontSize: 14,
    marginLeft: 4,
  },
  mediaPickerButton: {
    marginTop: 6,
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaPickerButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  mediaPreviewRow: {
    marginTop: 12,
  },
  mediaPreviewItem: {
    width: 118,
    height: 118,
    borderRadius: 12,
    marginRight: 10,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  mediaPreviewImage: {
    width: '100%',
    height: '100%',
  },
  mediaBadge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  mediaBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  removeMediaButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeMediaButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  typeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
  },
  typeButtonSelected: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  typeText: {
    fontSize: 14,
    color: '#4B5563',
  },
  typeTextSelected: {
    color: '#fff',
  },
});