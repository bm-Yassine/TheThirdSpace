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
import { router } from 'expo-router';
import FloatingNavigation from '../components/FloatingNavigation';
import { dataService, authService, type UserProfile } from '../Backend/firebase';
import { upsertCachedEvent } from '../lib/eventFeed';
import * as ImagePicker from 'expo-image-picker';
import type { Event, EventMedia, EventMusic } from '../lib/types';

export default function CreateEventScreen() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<{
    title: string;
    type: string;
    time: string;
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
    time: '',
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

  // Check authentication and load user profile
  useEffect(() => {
    const checkAuth = async () => {
      const user = authService.getCurrentUser();
      if (!user) {
        Alert.alert('Authentication Required', 'Please sign in to create an event.', [
          { text: 'OK', onPress: () => router.replace('/login') }
        ]);
        return;
      }

      try {
        let profile = await dataService.getCurrentUserProfile();
        
        // If profile doesn't exist, create it (fallback for edge cases)
        if (!profile) {
          console.log('Profile not found, creating default profile...');
          profile = await dataService.createUserProfile(user.uid, {
            email: user.email || '',
            displayName: user.displayName || 'User',
            photoURL: user.photoURL,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
        
        setUserProfile(profile);
      } catch (error) {
        console.error('Error loading profile:', error);
        // Don't redirect back, just show error and allow retry
        Alert.alert(
          'Profile Load Error', 
          'There was an issue loading your profile. You can still try to create the event.',
          [{ text: 'OK' }]
        );
        // Set a minimal profile to allow event creation
        setUserProfile({
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'User',
          photoURL: user.photoURL || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

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
    const currentUser = authService.getCurrentUser();
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

    if (!formData.title || !formData.description || !formData.location || !formData.time || !formData.type) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

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
        time: formData.time,
        timeFlexible: formData.timeFlexible,
        date: new Date().toLocaleDateString(), // You might want to add a date picker
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

      const eventId = await dataService.createEvent(eventData);

      const createdEvent: Event = {
        ...eventData,
        id: eventId,
      };
      upsertCachedEvent(createdEvent, { maxItems: 60 });

      Alert.alert('Success', 'Event created successfully!', [
        { text: 'OK', onPress: () => router.replace('/home') }
      ]);
    } catch (error) {
      console.error('Error creating event:', error);
      Alert.alert('Error', 'Failed to create event. Please try again.');
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
        <Text style={styles.headerTitle}>Create Event</Text>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={formData.tags.length < 3}
          style={formData.tags.length >= 3 ? styles.createButtonEnabled : styles.createButtonDisabled}
        >
          <Text style={formData.tags.length >= 3 ? styles.createTextEnabled : styles.createTextDisabled}>
            Create
          </Text>
        </TouchableOpacity>
      </View>

      {/* Form */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.introCard}>
          <Text style={styles.introTitle}>Design your event experience</Text>
          <Text style={styles.introSubtitle}>
            Add key details, soundtrack, and media to make your activity stand out.
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

        {/* Time */}
        <View style={styles.formCard}>
          <Text style={styles.label}>Time *</Text>
          <TextInput
            style={styles.input}
            value={formData.time}
            onChangeText={(value) => handleInputChange('time', value)}
            placeholder="e.g., Saturday 3:00 PM"
            placeholderTextColor="#999"
          />
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Time is flexible</Text>
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