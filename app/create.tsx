import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
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
import { EVENT_TYPES, categoryByLabel, suggestTags } from '../lib/taxonomy';
import { loadEventDefaults, saveEventDefaults } from '../lib/eventDefaults';
import MusicPicker from '../components/MusicPicker';
import { creditLine } from '../lib/musicLicence';
import LocationField, { type LocationValue } from '../components/LocationField';
import { uploadEventMedia, uploadEventAudio, isRemoteUri, type UploadProgress } from '../lib/storage';
import { DEFAULT_MAP_CENTER, DEMO_MODE } from '../lib/config';
import { upsertCachedEvent, invalidateEventFeedCache } from '../lib/eventFeed';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Play } from 'lucide-react-native';
import type { Event, EventMedia, EventMusic } from '../lib/types';
import { showAlert } from '../lib/alert';
import CoverPicker from '../components/CoverPicker';
import {
  COVERS,
  coverUrl,
  findCover,
  isLibraryCover,
  suggestCover,
  type CoverCategory,
} from '../lib/coverLibrary';

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
    minPeople: string;
    maxPeople: string;
    openToAll: boolean;
    cost: string;
    description: string;
    tags: string[];
    musicTitle: string;
    musicArtist: string;
    musicStartAt: string;
    musicUri: string;
    musicFileName: string;
    musicAttribution: string;
    media: EventMedia[];
    /** A library cover, used when the organizer uploads no photo of their own. */
    coverId: string;
  }>({
    title: '',
    type: '',
    timeFlexible: false,
    minPeople: '',
    maxPeople: '',
    openToAll: true,
    cost: '',
    description: '',
    tags: [],
    musicTitle: '',
    musicArtist: '',
    musicStartAt: '',
    musicUri: '',
    musicFileName: '',
    musicAttribution: '',
    media: [],
    coverId: '',
  });

  const [newTag, setNewTag] = useState('');
  const [schedule, setSchedule] = useState<EventSchedule>(defaultSchedule);
  const [submitting, setSubmitting] = useState(false);
  const [loadedEvent, setLoadedEvent] = useState<any | null>(null);
  const [location, setLocation] = useState<LocationValue>({ label: '' });
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [prefilled, setPrefilled] = useState(false);
  const [musicPickerOpen, setMusicPickerOpen] = useState(false);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);

  const coverCategory = useMemo(
    () => (categoryByLabel(formData.type)?.id as CoverCategory | undefined) ?? null,
    [formData.type]
  );

  /**
   * Fixed once per form. Seeding the automatic cover on the title instead
   * would reshuffle the picture — and fetch a new one — on every keystroke;
   * seeding it on the category alone would give every supper club in the city
   * the same photo. Once the event is saved the choice is pinned in its
   * imageUrl, so this never needs to survive a reload.
   */
  const coverSeed = useRef(Math.random().toString(36).slice(2)).current;

  /** The organizer's own photo or video, if they picked one. */
  const backgroundMedia = formData.media[0] ?? null;

  /**
   * The library cover, used when the organizer supplies no media of their own:
   * their choice if they made one, otherwise one picked from their category.
   */
  const chosenCover = useMemo(
    () =>
      (formData.coverId ? findCover(formData.coverId) : undefined) ??
      suggestCover({ categoryId: coverCategory, seed: editingEventId || coverSeed }),
    [formData.coverId, coverCategory, editingEventId, coverSeed]
  );

  // Waits for the auth provider to settle before deciding the user is signed
  // out — a synchronous currentUser read is null during web session restore.
  useEffect(() => {
    if (initializing) return;

    if (!user) {
      showAlert('Sign in required', 'Please sign in to continue.', [
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

  /**
   * Creating again reuses last time's venue, capacity, price and duration.
   * Only on create: in edit mode the stored event is the source of truth, and
   * overwriting it with stale defaults would quietly corrupt someone's event.
   */
  useEffect(() => {
    if (isEditing || prefilled || !user) return;

    let active = true;
    loadEventDefaults().then((defaults) => {
      if (!active || !defaults) {
        if (active) setPrefilled(true);
        return;
      }

      setFormData((prev) => ({
        ...prev,
        type: prev.type || defaults.type || '',
        minPeople: prev.minPeople || defaults.minPeople || '',
        maxPeople: prev.maxPeople || defaults.maxPeople || '',
        cost: prev.cost || defaults.cost || '',
        openToAll: defaults.openToAll ?? prev.openToAll,
      }));

      if (defaults.location?.label) setLocation(defaults.location);
      if (defaults.durationMinutes) {
        setSchedule((prev) => ({ ...prev, durationMinutes: defaults.durationMinutes! }));
      }
      setPrefilled(true);
    });

    return () => {
      active = false;
    };
  }, [isEditing, prefilled, user]);

  // In edit mode, hydrate the form from the stored event.
  useEffect(() => {
    if (!isEditing || !user) return;

    let active = true;
    (async () => {
      try {
        const event: any = await dataService.getEvent(editingEventId);
        if (!active) return;

        if (!event) {
          showAlert('Not found', 'That event no longer exists.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
          return;
        }
        if (event.createdBy !== user.uid) {
          showAlert('Not allowed', 'Only the organizer can edit this event.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
          return;
        }

        setLoadedEvent(event);
        setFormData({
          title: event.title || '',
          type: event.type || '',
          timeFlexible: !!event.timeFlexible,
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
          musicUri: event.music?.uri || '',
          musicFileName: event.music?.fileName || '',
          musicAttribution: event.music?.attribution || '',
          media: event.media || [],
          // Only a library cover can be restored as a choice. An uploaded
          // photo lives in event.media and takes precedence anyway.
          coverId: isLibraryCover(event.imageUrl)
            ? (COVERS.find((cover) => String(event.imageUrl).includes(cover.id))?.id ?? '')
            : '',
        });

        setLocation({
          label: event.location || '',
          latitude: typeof event.latitude === 'number' ? event.latitude : undefined,
          longitude: typeof event.longitude === 'number' ? event.longitude : undefined,
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
        showAlert('Error', 'Could not load that event.');
      }
    })();

    return () => {
      active = false;
    };
  }, [isEditing, editingEventId, user]);

  const activityTypes = EVENT_TYPES;


  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  /**
   * Tags worth offering, inferred from the title, description and type, minus
   * whatever is already chosen. Requiring three hand-typed tags was the
   * slowest part of creating an event, and hand-typed tags rarely matched the
   * vocabulary the feed ranks against.
   */
  const suggestedTags = useMemo(
    () =>
      suggestTags({
        title: formData.title,
        description: formData.description,
        type: formData.type,
        limit: 10,
      }).filter((tag) => !formData.tags.includes(tag)),
    [formData.title, formData.description, formData.type, formData.tags]
  );

  const addSuggestedTag = (tag: string) =>
    setFormData((prev) =>
      prev.tags.includes(tag) ? prev : { ...prev, tags: [...prev.tags, tag] }
    );

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
        showAlert('Permission needed', 'Please allow media library access to add photos/videos.');
        return;
      }

      // One item, not a gallery: an event has a single background, shown
      // full-bleed in Discover and blurred behind the card in Cards. A second
      // photo had nowhere to appear.
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: false,
        allowsMultipleSelection: false,
        quality: 0.9,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setFormData((prev) => ({
        ...prev,
        media: [
          {
            uri: asset.uri,
            type: asset.type === 'video' ? 'video' : 'image',
            width: asset.width,
            height: asset.height,
            durationMs: asset.duration ?? undefined,
          },
        ],
      }));
    } catch (error) {
      console.error('Error selecting media:', error);
      showAlert('Error', 'Could not access media library right now.');
    }
  };

  const pickAudioTrack = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const MAX_MB = 15;
      if (asset.size && asset.size > MAX_MB * 1024 * 1024) {
        showAlert('File too large', `Please choose a track under ${MAX_MB} MB.`);
        return;
      }

      setFormData((prev) => ({
        ...prev,
        musicUri: asset.uri,
        musicFileName: asset.name || 'track',
        // Seed the title from the filename when the field is still empty.
        musicTitle: prev.musicTitle || (asset.name || '').replace(/\.[^.]+$/, ''),
        // The organizer's own file owes no credit, and keeping the one from a
        // library track they picked first would credit the wrong person.
        musicAttribution: '',
      }));
    } catch (error) {
      console.error('Error picking audio:', error);
      showAlert('Error', 'Could not open your files right now.');
    }
  };

  const removeAudioTrack = () =>
    setFormData((prev) => ({
      ...prev,
      musicUri: '',
      musicFileName: '',
      musicAttribution: '',
    }));

  const removeMedia = (uri: string) => {
    setFormData((prev) => ({
      ...prev,
      media: prev.media.filter((item) => item.uri !== uri),
    }));
  };

  const handleSubmit = async () => {
    const currentUser = user;
    if (!currentUser) {
      showAlert('Authentication Required', 'Please sign in to create an event.', [
        { text: 'OK', onPress: () => router.replace('/login') },
      ]);
      return;
    }

    if (!userProfile) {
      showAlert('Error', 'Unable to create event. Please try again.');
      return;
    }

    if (formData.tags.length < 3) {
      showAlert('Error', 'Please add at least 3 tags');
      return;
    }

    if (!formData.title || !formData.description || !location.label.trim() || !formData.type) {
      showAlert('Error', 'Please fill in all required fields');
      return;
    }

    const startsAt = combineDateAndTime(schedule.date, schedule.time);
    if (!startsAt) {
      showAlert('Invalid date', 'Please pick a valid date and start time.');
      return;
    }

    if (startsAt.getTime() < Date.now() - 60 * 1000) {
      showAlert('Date in the past', 'Pick a start time in the future so people can still join.');
      return;
    }

    const minCapacity = parseInt(formData.minPeople, 10);
    const maxCapacity = parseInt(formData.maxPeople, 10);

    if (
      isEditing &&
      Number.isFinite(maxCapacity) &&
      maxCapacity < Number(loadedEvent?.attendees || 0)
    ) {
      showAlert(
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
      showAlert('Check capacity', 'The minimum number of people cannot exceed the maximum.');
      return;
    }

    setSubmitting(true);
    try {
      const parsedCost = formData.cost ? parseFloat(formData.cost.replace('$', '')) || 0 : 0;
      const maxAttendees = parseInt(formData.maxPeople) || undefined;
      const minAttendees = parseInt(formData.minPeople) || undefined;
      // Upload the soundtrack if a local file was picked.
      let musicUri = formData.musicUri;
      if (musicUri && !isRemoteUri(musicUri) && !DEMO_MODE) {
        try {
          musicUri = await uploadEventAudio(musicUri, formData.musicFileName || 'track');
        } catch (audioError) {
          console.error('Audio upload failed:', audioError);
          showAlert(
            'Upload failed',
            'The soundtrack could not be uploaded. The event has not been saved.'
          );
          return;
        }
      }

      const parsedMusicStartAt = parseFloat(formData.musicStartAt);
      const eventMusic: EventMusic | undefined = formData.musicTitle.trim()
        ? {
            title: formData.musicTitle.trim(),
            artist: formData.musicArtist.trim() || undefined,
            startAtSeconds:
              Number.isFinite(parsedMusicStartAt) && parsedMusicStartAt >= 0
                ? parsedMusicStartAt
                : undefined,
            uri: musicUri || undefined,
            fileName: formData.musicFileName || undefined,
            attribution: formData.musicAttribution.trim() || undefined,
          }
        : undefined;

      // Media must be uploaded before the event is written. Local picker URIs
      // (file:// on native, blob: on web) resolve only on the device that
      // picked them, so storing one would show every other user a broken image.
      let uploadedMedia = formData.media;
      if (formData.media.length > 0 && !DEMO_MODE) {
        try {
          uploadedMedia = await uploadEventMedia(formData.media, setUploadProgress);
        } catch (uploadError) {
          console.error('Media upload failed:', uploadError);
          showAlert(
            'Upload failed',
            'Your photos could not be uploaded. The event has not been saved — check your connection and try again.'
          );
          return;
        } finally {
          setUploadProgress(null);
        }
      }

      const primaryImageFromMedia = uploadedMedia.find((item) => item.type === 'image')?.uri;

      const eventData = {
        title: formData.title,
        type: formData.type,
        description: formData.description,
        location: location.label.trim(),
        // Only set when the organizer picked a real place; the map filters on
        // these being finite numbers.
        latitude: location.latitude,
        longitude: location.longitude,
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
        media: uploadedMedia,
        attendees: 0,
        organizer: { 
          uid: currentUser.uid,
          name:
            userProfile.displayName ||
            currentUser.displayName ||
            currentUser.email ||
            'User',
          photoURL: userProfile.photoURL,
        },
        // An organizer's own photo wins; then a cover they chose; then one
        // picked for them from the library. Previously every event without a
        // photo fell back to one hardcoded image, so the feed showed the same
        // mountain lake over and over.
        imageUrl: primaryImageFromMedia || coverUrl(chosenCover, 'full'),
      };

      if (isEditing) {
        // Capacity and organizer identity are not editable here: lowering
        // capacity below the number already confirmed would silently invalidate
        // people's places, which needs its own flow.
        await dataService.updateEvent(editingEventId, eventData);
        invalidateEventFeedCache();

        showAlert('Changes saved', 'Your event has been updated.', [
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

      // Remembered for next time, so a recurring event is near-instant.
      saveEventDefaults({
        type: formData.type,
        location,
        minPeople: formData.minPeople,
        maxPeople: formData.maxPeople,
        cost: formData.cost,
        openToAll: formData.openToAll,
        durationMinutes: schedule.durationMinutes,
      });

      const createdEvent: Event = {
        ...eventData,
        id: eventId,
      };
      upsertCachedEvent(createdEvent, { maxItems: 60 });

      showAlert('Event created', 'Your event is now live in Discover.', [
        {
          text: 'View it',
          onPress: () => router.replace({ pathname: '/activity_detail', params: { eventId } }),
        },
        { text: 'Done', onPress: () => router.replace('/home') },
      ]);
    } catch (error: any) {
      console.error(isEditing ? 'Error updating event:' : 'Error creating event:', error);
      showAlert(
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
        <ActivityIndicator size="large" color="#6366f1" />
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
            {uploadProgress
              ? `${uploadProgress.percent}%`
              : submitting
              ? 'Saving…'
              : isEditing
              ? 'Save'
              : 'Create'}
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
        <View style={[styles.formCard, styles.locationCard]}>
          <Text style={styles.label}>Meeting Point *</Text>
          <LocationField value={location} onChange={setLocation} bias={DEFAULT_MAP_CENTER} />
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

          {suggestedTags.length > 0 && (
            <View style={styles.suggestBlock}>
              <Text style={styles.suggestLabel}>Suggested — tap to add</Text>
              <View style={styles.tagsContainer}>
                {suggestedTags.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={styles.suggestTag}
                    onPress={() => addSuggestedTag(tag)}
                  >
                    <Text style={styles.suggestTagText}>+ {tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

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
          {formData.musicUri ? (
            <View>
              <View style={styles.trackRow}>
                <Text style={styles.trackName} numberOfLines={1}>
                  {formData.musicFileName || formData.musicTitle || 'Track attached'}
                </Text>
                <TouchableOpacity
                  onPress={removeAudioTrack}
                  hitSlop={8}
                >
                  <Text style={styles.trackRemove}>Remove</Text>
                </TouchableOpacity>
              </View>
              {/* A CC-BY credit has to travel with the track. */}
              {!!formData.musicAttribution && (
                <Text style={styles.creditNote}>{formData.musicAttribution}</Text>
              )}
            </View>
          ) : (
            <View style={styles.inputSpacing}>
              <TouchableOpacity
                style={styles.libraryButton}
                onPress={() => setMusicPickerOpen(true)}
              >
                <Text style={styles.libraryButtonText}>Browse the music library</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ownFileButton} onPress={pickAudioTrack}>
                <Text style={styles.ownFileButtonText}>Or use my own file</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.helperText}>
            The track plays behind your event in the Discover feed. Library tracks are
            cleared for use; if you upload your own, make sure you have the rights.
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>Event background</Text>

          <View style={styles.coverRow}>
            {backgroundMedia?.type === 'video' ? (
              // <Image> renders nothing for a video file, so a picked video
              // previewed as a blank tile.
              <View style={[styles.coverPreview, styles.videoPreview]}>
                <Play size={18} color="#ffffff" />
              </View>
            ) : (
              <Image
                source={{ uri: backgroundMedia?.uri ?? coverUrl(chosenCover, 'thumb') }}
                style={styles.coverPreview}
                resizeMode="cover"
              />
            )}

            <View style={styles.coverCopy}>
              <Text style={styles.coverName} numberOfLines={1}>
                {backgroundMedia
                  ? backgroundMedia.type === 'video'
                    ? 'Your video'
                    : 'Your photo'
                  : formData.coverId
                    ? chosenCover.label
                    : `${chosenCover.label} (picked for you)`}
              </Text>
              {backgroundMedia ? (
                <TouchableOpacity
                  style={styles.ownFileButton}
                  onPress={() => removeMedia(backgroundMedia.uri)}
                >
                  <Text style={styles.ownFileButtonText}>Remove</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.ownFileButton}
                  onPress={() => setCoverPickerOpen(true)}
                >
                  <Text style={styles.ownFileButtonText}>Choose a cover</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <TouchableOpacity style={styles.mediaPickerButton} onPress={pickMediaFromDevice}>
            <Text style={styles.mediaPickerButtonText}>
              {backgroundMedia ? 'Replace with another' : 'Use my own photo or video'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.helperText}>
            One photo or video. It fills the screen in Discover, and sits blurred behind the card
            in Cards.
          </Text>
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
      <MusicPicker
        visible={musicPickerOpen}
        onClose={() => setMusicPickerOpen(false)}
        onSelect={(track) => {
          setFormData((prev) => ({
            ...prev,
            musicUri: track.uri,
            musicFileName: track.title,
            musicTitle: track.title,
            musicArtist: track.artist,
            musicAttribution: creditLine(track) ?? '',
          }));
        }}
      />

      <CoverPicker
        visible={coverPickerOpen}
        onClose={() => setCoverPickerOpen(false)}
        selectedId={formData.coverId || undefined}
        initialCategory={coverCategory}
        onSelect={(cover) => {
          setFormData((prev) => ({ ...prev, coverId: cover.id }));
          setCoverPickerOpen(false);
        }}
      />

      <FloatingNavigation activeScreen="create" tone="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#ffffff',
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
  locationCard: { zIndex: 20 },
  libraryButton: {
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  libraryButtonText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  coverRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  coverPreview: { width: 96, height: 64, borderRadius: 10, backgroundColor: '#e5e7eb' },
  coverCopy: { flex: 1 },
  coverName: { fontSize: 13, fontWeight: '600', color: '#374151' },

  ownFileButton: { paddingVertical: 11, alignItems: 'center' },
  ownFileButtonText: { fontSize: 13, fontWeight: '600', color: '#4f46e5' },
  creditNote: { fontSize: 11, color: '#6b7280', marginTop: 6, fontStyle: 'italic' },

  suggestBlock: { marginBottom: 12 },
  suggestLabel: { fontSize: 12, fontWeight: '700', color: '#6b7280', marginBottom: 7 },
  suggestTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    backgroundColor: '#eef2ff',
  },
  suggestTagText: { fontSize: 12.5, color: '#4338ca', fontWeight: '600' },
  videoPreview: {
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  trackName: { flex: 1, fontSize: 13, color: '#3730a3', fontWeight: '600' },
  trackRemove: { fontSize: 12, color: '#4f46e5', fontWeight: '700' },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#f9fafb',
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
    backgroundColor: '#e5e7eb',
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
    color: '#6b7280',
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
  typeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  typeButtonSelected: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  typeText: {
    fontSize: 14,
    color: '#4b5563',
  },
  typeTextSelected: {
    color: '#fff',
  },
});