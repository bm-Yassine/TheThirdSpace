import { mockEvents } from './events';
import type { Attendee, Event, Rating, ReputationSummary } from './types';
import type { ChatMessage, ConversationSummary, UserCommitment, UserProfile } from '../Backend/firebase';

/**
 * In-memory backing store for demo mode.
 *
 * Demo mode lets someone open the app and click through every screen — profile,
 * hosting, approvals, chat, ratings — without creating an account. That matters
 * for a portfolio piece, where asking a visitor to sign up loses most of them.
 *
 * Nothing here touches Firebase. State lives for the session only, but writes
 * do apply, so the flows behave like the real thing rather than being frozen
 * screenshots.
 */

export const DEMO_UID = 'demo-user';

const minutes = (n: number) => n * 60 * 1000;
const days = (n: number) => n * 24 * minutes(60);

export const demoProfile: UserProfile = {
  uid: DEMO_UID,
  email: 'alex@example.com',
  displayName: 'Alex Rivera',
  photoURL: null,
  bio: 'Runs a supper club on weekends. Always up for live music, bouldering, or anything that ends with food.',
  interests: ['Live Music', 'Food & Drink', 'Bouldering', 'Photography', 'Cycling'],
  createdAt: new Date(Date.now() - days(240)),
  updatedAt: new Date(),
  stats: { eventsJoined: 12, eventsCreated: 4, rating: 4.7 },
};

const otherPeople = [
  { uid: 'demo-priya', name: 'Priya Raman', avatar: '👩🏽‍🎨' },
  { uid: 'demo-tom', name: 'Tom Okafor', avatar: '🧑🏿‍🍳' },
  { uid: 'demo-lena', name: 'Lena Bauer', avatar: '👩🏼‍🦰' },
  { uid: 'demo-yuki', name: 'Yuki Tanaka', avatar: '🧑🏻‍🎤' },
  { uid: 'demo-sam', name: 'Sam Whitfield', avatar: '🧔🏻' },
];

const at = (offsetDays: number, hour: number, minute = 0) => {
  const date = new Date(Date.now() + offsetDays * days(1));
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

/** Events the demo user hosts, on top of the shared seed feed. */
const hostedEvents: any[] = [
  {
    id: 'demo-hosted-1',
    title: 'Rooftop Supper Club',
    description:
      'Six courses, one long table, strangers who leave as friends. Bring an appetite and a bottle.',
    type: 'Food & Drink',
    imageUrl:
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=1200&fit=crop',
    organizer: { uid: DEMO_UID, name: demoProfile.displayName, avatar: '🧑‍🍳', photoURL: null },
    createdBy: DEMO_UID,
    startsAt: at(5, 19, 30),
    durationMinutes: 210,
    location: 'Wythe Rooftop, Williamsburg',
    latitude: 40.7218,
    longitude: -73.9576,
    attendees: 0,
    pendingCount: 0,
    waitlistCount: 0,
    maxAttendees: 12,
    minAttendees: 6,
    tags: ['Food', 'Social', 'Supper Club'],
    cost: 32,
    requiresApproval: true,
    status: 'active',
  },
  {
    id: 'demo-hosted-2',
    title: 'Sunrise Bouldering',
    description: 'Early session before the gym fills up. All grades, no ego.',
    type: 'Sports',
    imageUrl:
      'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=800&h=1200&fit=crop',
    organizer: { uid: DEMO_UID, name: demoProfile.displayName, avatar: '🧗', photoURL: null },
    createdBy: DEMO_UID,
    startsAt: at(-12, 7, 0),
    durationMinutes: 120,
    location: 'Brooklyn Boulders, Gowanus',
    latitude: 40.6782,
    longitude: -73.9899,
    attendees: 0,
    pendingCount: 0,
    waitlistCount: 0,
    maxAttendees: 8,
    tags: ['Climbing', 'Morning', 'Sports'],
    cost: 0,
    requiresApproval: false,
    status: 'active',
  },
];

const confirmedGuests = [
  { uid: 'demo-lena', name: 'Lena Bauer', avatar: '👩🏼‍🦰' },
  { uid: 'demo-yuki', name: 'Yuki Tanaka', avatar: '🧑🏻‍🎤' },
  { uid: 'demo-marco', name: 'Marco Silva', avatar: '🧑🏽‍💻' },
  { uid: 'demo-aisha', name: 'Aisha Bello', avatar: '👩🏾‍⚕️' },
  { uid: 'demo-ines', name: 'Inès Moreau', avatar: '👩🏻‍🏫' },
  { uid: 'demo-oliver', name: 'Oliver Grant', avatar: '👨🏼‍🌾' },
  { uid: 'demo-noor', name: 'Noor Haddad', avatar: '👩🏽‍🔬' },
  { uid: 'demo-jonas', name: 'Jonas Berg', avatar: '🧑🏼‍🎨' },
];

/**
 * Participants on the hosted events — drives the approval screen.
 * Counts here are the source of truth for the event's denormalised counters
 * below, so the header total and the section totals always agree.
 */
const hostedParticipants: Record<string, Attendee[]> = {
  'demo-hosted-1': [
    { uid: 'demo-priya', name: 'Priya Raman', avatar: '👩🏽‍🎨', status: 'pending', reason: 'approval', paymentStatus: 'completed', joinedAt: new Date(Date.now() - minutes(90)) },
    { uid: 'demo-tom', name: 'Tom Okafor', avatar: '🧑🏿‍🍳', status: 'pending', reason: 'approval', paymentStatus: 'completed', joinedAt: new Date(Date.now() - minutes(50)) },
    { uid: 'demo-sam', name: 'Sam Whitfield', avatar: '🧔🏻', status: 'pending', reason: 'payment', paymentStatus: 'pending', joinedAt: new Date(Date.now() - minutes(20)) },
    ...confirmedGuests.map((guest, index) => ({
      ...guest,
      status: 'confirmed' as const,
      reason: 'approval' as const,
      paymentStatus: 'completed' as const,
      joinedAt: new Date(Date.now() - days(index + 2)),
    })),
    { uid: 'demo-ravi', name: 'Ravi Menon', avatar: '🧑🏾‍🚀', status: 'waitlisted', reason: 'waitlist', paymentStatus: 'completed', joinedAt: new Date(Date.now() - days(1)) },
    { uid: 'demo-clara', name: 'Clara Nowak', avatar: '👩🏻‍🎤', status: 'waitlisted', reason: 'waitlist', paymentStatus: 'completed', joinedAt: new Date(Date.now() - minutes(240)) },
  ],
  'demo-hosted-2': confirmedGuests.slice(0, 6).map((guest, index) => ({
    ...guest,
    status: 'confirmed' as const,
    reason: 'direct' as const,
    paymentStatus: 'not_required' as const,
    joinedAt: new Date(Date.now() - days(index + 13)),
  })),
};

/** Counters derived from the participant lists so nothing can drift. */
const countBy = (eventId: string, status: Attendee['status']) =>
  (hostedParticipants[eventId] || []).filter((p) => p.status === status).length;

const seedEvents = (): any[] => [
  ...hostedEvents.map((event) => ({
    ...event,
    attendees: countBy(String(event.id), 'confirmed'),
    pendingCount: countBy(String(event.id), 'pending'),
    waitlistCount: countBy(String(event.id), 'waitlisted'),
  })),
  ...mockEvents.map((event) => ({
    ...event,
    id: String(event.id),
    createdBy: `demo-organizer-${event.id}`,
    organizer: {
      ...event.organizer,
      uid: `demo-organizer-${event.id}`,
      photoURL: null,
    },
  })),
];

type DemoState = {
  events: Map<string, any>;
  participants: Map<string, Attendee[]>;
  favorites: Set<string>;
  commitments: Map<string, UserCommitment>;
  conversations: ConversationSummary[];
  messages: Map<string, ChatMessage[]>;
  ratings: Rating[];
  ratedEvents: Set<string>;
  profile: UserProfile;
};

const buildState = (): DemoState => {
  const events = new Map<string, any>();
  seedEvents().forEach((event) => events.set(String(event.id), event));

  const participants = new Map<string, Attendee[]>();
  Object.entries(hostedParticipants).forEach(([id, list]) => participants.set(id, [...list]));

  // Two upcoming, two attended — enough to show both profile tabs populated.
  const commitments = new Map<string, UserCommitment>([
    ['2', { eventId: '2', status: 'confirmed', reason: 'direct', paymentStatus: 'completed', committedAt: new Date(Date.now() - days(3)), eventTitle: 'Photography Walk' }],
    ['6', { eventId: '6', status: 'pending', reason: 'approval', paymentStatus: 'completed', committedAt: new Date(Date.now() - days(1)), eventTitle: 'Rooftop Jazz & Wine' }],
    ['5', { eventId: '5', status: 'waitlisted', reason: 'waitlist', paymentStatus: 'not_required', committedAt: new Date(Date.now() - days(2)), eventTitle: 'Community Garden Planting' }],
    ['7', { eventId: '7', status: 'confirmed', reason: 'direct', paymentStatus: 'not_required', committedAt: new Date(Date.now() - days(10)), eventTitle: 'Sunset Beach Volleyball' }],
    ['8', { eventId: '8', status: 'confirmed', reason: 'direct', paymentStatus: 'completed', committedAt: new Date(Date.now() - days(20)), eventTitle: 'Ceramics Studio Night' }],
  ]);

  const conversations: ConversationSummary[] = [
    {
      id: 'demo-conv-1',
      participantIds: [DEMO_UID, 'demo-priya'],
      otherUserId: 'demo-priya',
      otherUserName: 'Priya Raman',
      otherUserPhotoURL: null,
      lastMessage: 'Perfect, see you at 7:30!',
      lastMessageSenderId: 'demo-priya',
      updatedAt: new Date(Date.now() - minutes(12)),
    },
    {
      id: 'demo-conv-2',
      participantIds: [DEMO_UID, 'demo-tom'],
      otherUserId: 'demo-tom',
      otherUserName: 'Tom Okafor',
      otherUserPhotoURL: null,
      lastMessage: 'Is there still a spot for the supper club?',
      lastMessageSenderId: 'demo-tom',
      updatedAt: new Date(Date.now() - minutes(95)),
    },
    {
      id: 'demo-conv-3',
      participantIds: [DEMO_UID, 'demo-lena'],
      otherUserId: 'demo-lena',
      otherUserName: 'Lena Bauer',
      otherUserPhotoURL: null,
      lastMessage: 'That was such a good session, thanks for organising.',
      lastMessageSenderId: 'demo-lena',
      updatedAt: new Date(Date.now() - days(2)),
    },
  ];

  const messages = new Map<string, ChatMessage[]>([
    [
      'demo-conv-1',
      [
        { id: 'm1', conversationId: 'demo-conv-1', senderId: 'demo-priya', text: 'Hey! Just requested a place at the supper club 🙌', createdAt: new Date(Date.now() - minutes(95)) },
        { id: 'm2', conversationId: 'demo-conv-1', senderId: DEMO_UID, text: 'Saw it — approving you now. Any allergies I should know about?', createdAt: new Date(Date.now() - minutes(70)) },
        { id: 'm3', conversationId: 'demo-conv-1', senderId: 'demo-priya', text: 'No allergies, but I am vegetarian if that works?', createdAt: new Date(Date.now() - minutes(48)) },
        { id: 'm4', conversationId: 'demo-conv-1', senderId: DEMO_UID, text: 'Totally fine, three of the six courses already are. Doors at 7:30.', createdAt: new Date(Date.now() - minutes(30)) },
        { id: 'm5', conversationId: 'demo-conv-1', senderId: 'demo-priya', text: 'Perfect, see you at 7:30!', createdAt: new Date(Date.now() - minutes(12)) },
      ],
    ],
    [
      'demo-conv-2',
      [
        { id: 'm6', conversationId: 'demo-conv-2', senderId: 'demo-tom', text: 'Is there still a spot for the supper club?', createdAt: new Date(Date.now() - minutes(95)) },
      ],
    ],
    [
      'demo-conv-3',
      [
        { id: 'm7', conversationId: 'demo-conv-3', senderId: 'demo-lena', text: 'That was such a good session, thanks for organising.', createdAt: new Date(Date.now() - days(2)) },
      ],
    ],
  ]);

  const ratings: Rating[] = [
    { id: 'r1', eventId: 'demo-hosted-2', raterUid: 'demo-lena', rateeUid: DEMO_UID, rateeRole: 'organizer', qualityId: 'organized', qualityLabel: 'Super Organized', qualityEmoji: '📋', stars: 5, createdAt: new Date(Date.now() - days(11)) },
    { id: 'r2', eventId: 'demo-hosted-2', raterUid: 'demo-yuki', rateeUid: DEMO_UID, rateeRole: 'organizer', qualityId: 'welcoming', qualityLabel: 'Very Welcoming', qualityEmoji: '🤗', stars: 5, createdAt: new Date(Date.now() - days(11)) },
    { id: 'r3', eventId: 'demo-past-a', raterUid: 'demo-tom', rateeUid: DEMO_UID, rateeRole: 'organizer', qualityId: 'organized', qualityLabel: 'Super Organized', qualityEmoji: '📋', stars: 4, createdAt: new Date(Date.now() - days(40)) },
    { id: 'r4', eventId: 'demo-past-a', raterUid: 'demo-priya', rateeUid: DEMO_UID, rateeRole: 'attendee', qualityId: 'positive', qualityLabel: 'Positive Energy', qualityEmoji: '😊', stars: 5, createdAt: new Date(Date.now() - days(40)) },
  ];

  return {
    events,
    participants,
    favorites: new Set(['2', '6']),
    commitments,
    conversations,
    messages,
    ratings,
    // '7' left unrated on purpose so the "events to rate" prompt is visible.
    ratedEvents: new Set(['8']),
    profile: { ...demoProfile },
  };
};

export const demoState: DemoState = buildState();

export const demoPeople = otherPeople;

export const demoReputation = (uid: string): ReputationSummary => {
  const received = demoState.ratings.filter((rating) => rating.rateeUid === uid);
  const qualityCounts: Record<string, number> = {};
  let starTotal = 0;
  let starCount = 0;

  received.forEach((rating) => {
    const key = rating.qualityLabel || rating.qualityId;
    qualityCounts[key] = (qualityCounts[key] || 0) + 1;
    if (rating.stars) {
      starTotal += rating.stars;
      starCount += 1;
    }
  });

  return {
    ratingCount: received.length,
    averageStars: starCount ? Number((starTotal / starCount).toFixed(2)) : 0,
    qualityCounts,
  };
};

export const demoEventList = (): Event[] => Array.from(demoState.events.values()) as Event[];
