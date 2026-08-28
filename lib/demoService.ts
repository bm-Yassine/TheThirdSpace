import {
  DEMO_UID,
  demoEventList,
  demoReputation,
  demoState,
} from './demoData';
import { hasEventEnded } from './eventTime';
import { counterChanges, decideJoinOutcome } from './participation';
import type { Attendee, AttendeeStatus, Rating, ReputationSummary } from './types';
import type { ChatMessage, ConversationSummary, UserCommitment, UserProfile } from '../Backend/firebase';

/**
 * Demo-mode implementation of the data layer.
 *
 * Mirrors the shape of `dataService` and reuses the same participation state
 * machine, so the flows behave identically to the Firestore-backed path —
 * joining a full event still waitlists, approving still moves the counters.
 * State is per-session and in memory.
 */

const delay = <T>(value: T, ms = 120): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

const applyCounters = (event: any, from: AttendeeStatus | null, to: AttendeeStatus | null) => {
  Object.entries(counterChanges(from, to)).forEach(([field, amount]) => {
    event[field] = Math.max((Number(event[field]) || 0) + amount, 0);
  });
};

const participantsFor = (eventId: string): Attendee[] => {
  if (!demoState.participants.has(eventId)) demoState.participants.set(eventId, []);
  return demoState.participants.get(eventId)!;
};

export const demoService = {
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    if (uid === DEMO_UID) return delay(demoState.profile);
    const event = demoEventList().find((e: any) => e.createdBy === uid) as any;
    if (!event) return delay(null);
    return delay({
      uid,
      email: '',
      displayName: event.organizer?.name || 'Organizer',
      photoURL: null,
      bio: 'Organizes events on The Third Space.',
      interests: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  },

  async getCurrentUserProfile() {
    return delay(demoState.profile);
  },

  async ensureUserProfileFromAuthUser() {
    return delay(demoState.profile);
  },

  async updateUserProfile(_uid: string, updates: Partial<UserProfile>) {
    Object.assign(demoState.profile, updates, { updatedAt: new Date() });
    return delay(undefined);
  },

  async getUserByDisplayName(displayName: string) {
    if (displayName === demoState.profile.displayName) return delay(demoState.profile);
    return delay(null);
  },

  async getEvents(filters?: { organizerId?: string; limit?: number }) {
    let events = demoEventList() as any[];
    if (filters?.organizerId) {
      events = events.filter((event) => event.createdBy === filters.organizerId);
    }
    return delay(filters?.limit ? events.slice(0, filters.limit) : events);
  },

  async getEvent(eventId: string) {
    return delay(demoState.events.get(String(eventId)) || null);
  },

  async getCurrentUserCreatedEvents() {
    return delay(demoEventList().filter((event: any) => event.createdBy === DEMO_UID));
  },

  async createEvent(eventData: any) {
    const id = `demo-created-${Date.now()}`;
    demoState.events.set(id, {
      ...eventData,
      id,
      createdBy: DEMO_UID,
      attendees: 0,
      pendingCount: 0,
      waitlistCount: 0,
      status: 'active',
      createdAt: new Date(),
    });
    return delay(id);
  },

  async updateEvent(eventId: string, updates: any) {
    const event = demoState.events.get(String(eventId));
    if (event) Object.assign(event, updates);
    return delay(undefined);
  },

  async deleteEvent(eventId: string) {
    demoState.events.delete(String(eventId));
    return delay(undefined);
  },

  async getUserFavorites() {
    return delay(Array.from(demoState.favorites));
  },

  async isFavorite(eventId: string) {
    return delay(demoState.favorites.has(String(eventId)));
  },

  async addToFavorites(eventId: string) {
    demoState.favorites.add(String(eventId));
    return delay(undefined);
  },

  async removeFromFavorites(eventId: string) {
    demoState.favorites.delete(String(eventId));
    return delay(undefined);
  },

  async joinEvent(eventId: string, options?: { paymentCompleted?: boolean }) {
    const id = String(eventId);
    const event = demoState.events.get(id);
    if (!event) throw new Error('Event not found');

    const { status, reason } = decideJoinOutcome({
      confirmedCount: Number(event.attendees || 0),
      maxAttendees: Number(event.maxAttendees || 0),
      cost: Number(event.cost || 0),
      requiresApproval: !!event.requiresApproval,
      paymentCompleted: !!options?.paymentCompleted,
    });

    applyCounters(event, null, status);
    participantsFor(id).push({
      uid: DEMO_UID,
      name: demoState.profile.displayName,
      avatar: '🙂',
      status,
      reason,
      paymentStatus: Number(event.cost || 0) > 0 ? (options?.paymentCompleted ? 'completed' : 'pending') : 'not_required',
      joinedAt: new Date(),
    });
    demoState.commitments.set(id, {
      eventId: id,
      status,
      reason,
      paymentStatus: Number(event.cost || 0) > 0 ? (options?.paymentCompleted ? 'completed' : 'pending') : 'not_required',
      committedAt: new Date(),
      eventTitle: event.title,
    });

    return delay({ status, reason });
  },

  async commitToEvent(eventId: string, options?: { paymentCompleted?: boolean }) {
    return this.joinEvent(eventId, options);
  },

  async leaveEvent(eventId: string) {
    const id = String(eventId);
    const commitment = demoState.commitments.get(id);
    const event = demoState.events.get(id);
    if (event && commitment) applyCounters(event, commitment.status, null);
    demoState.commitments.delete(id);
    demoState.participants.set(id, participantsFor(id).filter((p) => p.uid !== DEMO_UID));
    return delay(undefined);
  },

  async cancelCommitment(eventId: string) {
    return this.leaveEvent(eventId);
  },

  async getUserCommitments(): Promise<UserCommitment[]> {
    return delay(Array.from(demoState.commitments.values()));
  },

  async getUserCommitment(eventId: string): Promise<UserCommitment | null> {
    return delay(demoState.commitments.get(String(eventId)) || null);
  },

  async getEventParticipants(eventId: string, status?: AttendeeStatus) {
    const list = participantsFor(String(eventId));
    return delay(status ? list.filter((p) => p.status === status) : [...list]);
  },

  subscribeToEventParticipants(
    eventId: string,
    onChange: (participants: Attendee[]) => void
  ) {
    onChange([...participantsFor(String(eventId))]);
    // Demo state only changes through this tab, so a poll keeps the live
    // screen in step after an approve or decline without a real listener.
    const timer = setInterval(() => onChange([...participantsFor(String(eventId))]), 700);
    return () => clearInterval(timer);
  },

  async setParticipantStatus(eventId: string, participantUid: string, nextStatus: AttendeeStatus) {
    const id = String(eventId);
    const event = demoState.events.get(id);
    const participant = participantsFor(id).find((p) => p.uid === participantUid);
    if (!event || !participant) throw new Error('Participant not found');

    if (nextStatus === 'confirmed' && Number(event.cost || 0) > 0 && participant.paymentStatus !== 'completed') {
      throw new Error('This person has not completed payment yet');
    }

    applyCounters(event, participant.status, nextStatus);
    participant.status = nextStatus;
    return delay(undefined);
  },

  async approveParticipant(eventId: string, uid: string) {
    return this.setParticipantStatus(eventId, uid, 'confirmed');
  },

  async declineParticipant(eventId: string, uid: string) {
    return this.setParticipantStatus(eventId, uid, 'declined');
  },

  async markParticipantPaid(eventId: string) {
    const commitment = demoState.commitments.get(String(eventId));
    if (commitment) commitment.paymentStatus = 'completed';
    return delay(undefined);
  },

  async promoteFromWaitlist() {
    return delay(null);
  },

  async getOrCreateConversation(otherUserId: string) {
    const existing = demoState.conversations.find((c) => c.otherUserId === otherUserId);
    if (existing) return delay(existing.id);

    const id = `demo-conv-${Date.now()}`;
    demoState.conversations.unshift({
      id,
      participantIds: [DEMO_UID, otherUserId],
      otherUserId,
      otherUserName: 'Organizer',
      otherUserPhotoURL: null,
      lastMessage: '',
      updatedAt: new Date(),
    });
    demoState.messages.set(id, []);
    return delay(id);
  },

  async getUserConversations() {
    return delay([...demoState.conversations]);
  },

  async getConversationMessages(conversationId: string) {
    return delay([...(demoState.messages.get(conversationId) || [])]);
  },

  subscribeToConversations(onChange: (conversations: ConversationSummary[]) => void) {
    onChange([...demoState.conversations]);
    const timer = setInterval(() => onChange([...demoState.conversations]), 700);
    return () => clearInterval(timer);
  },

  subscribeToConversationMessages(
    conversationId: string,
    onChange: (messages: ChatMessage[]) => void
  ) {
    onChange([...(demoState.messages.get(conversationId) || [])]);
    const timer = setInterval(
      () => onChange([...(demoState.messages.get(conversationId) || [])]),
      700
    );
    return () => clearInterval(timer);
  },

  async sendMessage(conversationId: string, text: string) {
    const list = demoState.messages.get(conversationId) || [];
    const message: ChatMessage = {
      id: `demo-msg-${Date.now()}`,
      conversationId,
      senderId: DEMO_UID,
      text,
      createdAt: new Date(),
    };
    demoState.messages.set(conversationId, [...list, message]);

    const conversation = demoState.conversations.find((c) => c.id === conversationId);
    if (conversation) {
      conversation.lastMessage = text;
      conversation.lastMessageSenderId = DEMO_UID;
      conversation.updatedAt = new Date();
    }
    return delay(message.id);
  },

  async recordPayment() {
    return delay('demo-payment');
  },

  buildRatingId(eventId: string, raterUid: string, rateeUid: string) {
    return `${eventId}_${raterUid}_${rateeUid}`;
  },

  async submitRatings(eventId: string, entries: any[]) {
    entries.forEach((entry) => {
      demoState.ratings.push({
        id: this.buildRatingId(eventId, DEMO_UID, entry.rateeUid),
        eventId,
        raterUid: DEMO_UID,
        rateeUid: entry.rateeUid,
        rateeRole: entry.rateeRole,
        qualityId: entry.qualityId,
        qualityLabel: entry.qualityLabel,
        qualityEmoji: entry.qualityEmoji,
        stars: entry.stars,
        createdAt: new Date(),
      } as Rating);
    });
    demoState.ratedEvents.add(String(eventId));
    return delay(undefined);
  },

  async getReputation(uid: string): Promise<ReputationSummary> {
    return delay(demoReputation(uid));
  },

  async getUserRatings(uid: string) {
    return delay(demoState.ratings.filter((rating) => rating.rateeUid === uid));
  },

  async hasRatedEvent(eventId: string) {
    return delay(demoState.ratedEvents.has(String(eventId)));
  },

  async getEventsAwaitingRating() {
    const attended = Array.from(demoState.commitments.values())
      .filter((c) => c.status === 'confirmed' && !demoState.ratedEvents.has(String(c.eventId)))
      .map((c) => demoState.events.get(String(c.eventId)))
      .filter(Boolean)
      .filter((event) => hasEventEnded(event))
      .map((event) => ({ event, role: 'attendee' as const }));

    const hosted = demoEventList()
      .filter((event: any) => event.createdBy === DEMO_UID)
      .filter((event) => hasEventEnded(event) && !demoState.ratedEvents.has(String(event.id)))
      .map((event) => ({ event, role: 'organizer' as const }));

    return delay([...hosted, ...attended]);
  },
};
