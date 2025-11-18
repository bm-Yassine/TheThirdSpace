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
} from 'react-native';
import { router } from 'expo-router';
import FloatingNavigation from '../components/FloatingNavigation';
import { dataService, authService, type UserProfile } from '../Backend/firebase';

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
        const profile = await dataService.getCurrentUserProfile();
        if (!profile) {
          Alert.alert('Error', 'Unable to load user profile. Please try again.');
          router.back();
          return;
        }
        setUserProfile(profile);
      } catch (error) {
        console.error('Error loading profile:', error);
        Alert.alert('Error', 'Failed to load your profile. Please try again.');
        router.back();
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

  const handleSubmit = async () => {
    if (!userProfile) {
      Alert.alert('Error', 'Unable to create event. Please try again.');
      return;
    }

    if (formData.tags.length < 3) {
      Alert.alert('Error', 'Please add at least 3 tags');
      return;
    }

    if (!formData.title || !formData.description || !formData.location || !formData.time) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const eventData = {
        title: formData.title,
        description: formData.description,
        location: formData.location,
        time: formData.time,
        date: new Date().toLocaleDateString(), // You might want to add a date picker
        tags: formData.tags,
        cost: formData.cost ? parseFloat(formData.cost.replace('$', '')) || 0 : 0,
        requiresApproval: !formData.openToAll,
        maxAttendees: parseInt(formData.maxPeople) || undefined,
        minAttendees: parseInt(formData.minPeople) || undefined,
        attendees: 0,
        organizer: { 
          uid: userProfile.uid,
          name: userProfile.displayName,
          photoURL: userProfile.photoURL,
        },
        imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=800&fit=crop', // Default image
      };

      await dataService.createEvent(eventData);

      Alert.alert('Success', 'Event created successfully!', [
        { text: 'OK', onPress: () => router.push('/home') }
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
        {/* Activity Title */}
        <View style={styles.formGroup}>
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
        <View style={styles.formGroup}>
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
        <View style={styles.formGroup}>
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
        <View style={styles.formGroup}>
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
        <View style={styles.formGroup}>
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
        <View style={styles.formGroup}>
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
        <View style={styles.formGroup}>
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
        <View style={styles.formGroup}>
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
        <View style={styles.formGroup}>
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
      <FloatingNavigation activeScreen="create" />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
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
    backgroundColor: '#000',
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
    paddingBottom: 80,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
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
    backgroundColor: '#e5e5e5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
  },
  addButtonText: {
    fontSize: 24,
    color: '#666',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tag: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 14,
    color: '#333',
  },
  tagRemove: {
    fontSize: 16,
    color: '#666',
    marginLeft: 4,
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
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  typeButtonSelected: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  typeText: {
    fontSize: 14,
    color: '#666',
  },
  typeTextSelected: {
    color: '#fff',
  },
});
