import { Event } from './types';

/**
 * Development seed data. Only reaches the feed when EXPO_PUBLIC_USE_MOCK_EVENTS
 * is set (see lib/config.ts) — production never mixes these with real events.
 *
 * Timestamps are computed relative to load time so the seed set always contains
 * a realistic spread of upcoming and finished events, which is what exercises
 * the scheduling, history and post-event rating paths locally.
 */
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** Days from now (negative = in the past), at a given local hour. */
const at = (dayOffset: number, hour: number, minute = 0) => {
  const date = new Date(Date.now() + dayOffset * DAY);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};


export const mockEvents: Event[] = [
  {
    id: 1,
    title: "Morning Yoga Session",
    description: "Start your day with peaceful yoga in the park! 🧘‍♀️ All levels welcome",
    imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=800&fit=crop",
    organizer: { name: "Sarah Johnson", avatar: "👩‍🦰" },
    time: "8:00 AM - 9:30 AM",
    startsAt: at(0, 8, 0),
    durationMinutes: 90,
    location: "Central Park",
    latitude: 40.785091,
    longitude: -73.968285,
    attendees: 12,
    maxAttendees: 15,
    tags: ["Health", "Outdoor", "Beginner"],
    cost: 0,
    requiresApproval: false,
    isFavorite: false,
    isCommitted: false,
    commitmentStatus: null
  },
  {
    id: 2,
    title: "Photography Walk",
    description: "Capture the city's beauty with fellow photographers 📸",
    imageUrl: "https://images.unsplash.com/photo-1434394354979-a235cd36269d?w=400&h=800&fit=crop",
    organizer: { name: "Mike Chen", avatar: "👨‍💼" },
    time: "2:00 PM - 4:00 PM",
    startsAt: at(1, 14, 0),
    durationMinutes: 120,
    location: "Brooklyn Bridge",
    latitude: 40.706086,
    longitude: -73.996864,
    attendees: 8,
    maxAttendees: 12,
    tags: ["Photography", "Walking", "Art"],
    cost: 25,
    requiresApproval: false,
    isFavorite: true,
    isCommitted: false,
    commitmentStatus: null
  },
  {
    id: 3,
    title: "Book Club Meeting",
    description: "Join our cozy book discussion! This month: The Great Gatsby 📚",
    imageUrl: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=800&fit=crop",
    organizer: { name: "Emma Wilson", avatar: "👩‍🎓" },
    time: "7:00 PM - 8:30 PM",
    startsAt: at(2, 19, 0),
    durationMinutes: 90,
    location: "Local Library",
    latitude: 40.753182,
    longitude: -73.982253,
    attendees: 6,
    maxAttendees: 10,
    tags: ["Reading", "Discussion", "Indoor"],
    cost: 0,
    requiresApproval: true,
    isFavorite: false,
    isCommitted: true,
    commitmentStatus: 'pending'
  },
  {
    id: 4,
    title: "Premium Cooking Class",
    description: "Learn to cook authentic Italian pasta from a master chef! 🍝👨‍🍳",
    imageUrl: "https://images.unsplash.com/photo-1656711776904-993edf967bbf?w=400&h=800&fit=crop",
    organizer: { name: "Chef Antonio", avatar: "👨‍🍳" },
    time: "6:00 PM - 8:00 PM",
    startsAt: at(4, 18, 30),
    durationMinutes: 180,
    location: "Culinary School",
    latitude: 40.748817,
    longitude: -73.985428,
    attendees: 10,
    maxAttendees: 10,
    tags: ["Cooking", "Premium", "Learning"],
    cost: 75,
    requiresApproval: false,
    isFavorite: false,
    isCommitted: false,
    commitmentStatus: null
  },
  {
    id: 5,
    title: "Community Garden Planting",
    description: "Help plant flowers and vegetables in our community garden! 🌱 Free event",
    imageUrl: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=800&fit=crop",
    organizer: { name: "Jessica Green", avatar: "👩‍🌾" },
    time: "9:00 AM - 12:00 PM",
    startsAt: at(6, 10, 0),
    durationMinutes: 240,
    location: "Community Garden Center",
    latitude: 40.730610,
    longitude: -73.935242,
    attendees: 20,
    maxAttendees: 20,
    tags: ["Gardening", "Community", "Free"],
    cost: 0,
    requiresApproval: false,
    isFavorite: false,
    isCommitted: false,
    commitmentStatus: null
  },
  {
    id: 6,
    title: "Rooftop Jazz & Wine",
    description: "Live quartet, natural wine, skyline views. Approval required 🎷",
    imageUrl: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=800&fit=crop",
    organizer: { name: "Marcus Reid", avatar: "🎺" },
    time: "8:00 PM - 11:00 PM",
    startsAt: at(9, 20, 0),
    durationMinutes: 180,
    location: "The Nest Rooftop",
    latitude: 40.744679,
    longitude: -73.988716,
    attendees: 34,
    maxAttendees: 40,
    tags: ["Music", "Nightlife", "Drinks"],
    cost: 18,
    requiresApproval: true,
    isFavorite: false,
    isCommitted: false,
    commitmentStatus: null
  },
  {
    id: 7,
    title: "Sunset Beach Volleyball",
    description: "Casual games, all skill levels. Bring water! 🏐",
    imageUrl: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=400&h=800&fit=crop",
    organizer: { name: "Sarah Johnson", avatar: "👩‍🦰" },
    time: "7:00 PM - 9:00 PM",
    startsAt: at(-3, 19, 0),
    durationMinutes: 120,
    location: "Rockaway Beach",
    latitude: 40.583500,
    longitude: -73.815700,
    attendees: 14,
    maxAttendees: 16,
    tags: ["Sports", "Outdoor", "Social"],
    cost: 0,
    requiresApproval: false,
    isFavorite: false,
    isCommitted: false,
    commitmentStatus: null
  },
  {
    id: 8,
    title: "Ceramics Studio Night",
    description: "Hand-building workshop with all materials included 🏺",
    imageUrl: "https://images.unsplash.com/photo-1565193298357-c5b46b0e0e1a?w=400&h=800&fit=crop",
    organizer: { name: "Emma Wilson", avatar: "👩‍🎓" },
    time: "3:00 PM - 6:00 PM",
    startsAt: at(-10, 15, 0),
    durationMinutes: 180,
    location: "Kiln & Co Studio",
    latitude: 40.717800,
    longitude: -73.956400,
    attendees: 10,
    maxAttendees: 10,
    tags: ["Art", "Workshop", "Creative"],
    cost: 45,
    requiresApproval: false,
    isFavorite: false,
    isCommitted: false,
    commitmentStatus: null
  }
];
