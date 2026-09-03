export type Organizer = {
  uid?: string;
  name: string;
  avatar?: string;
  photoURL?: string | null;
};

export type EventMusic = {
  title: string;
  artist?: string;
  /** Where to start playback, so a track can open on its hook. */
  startAtSeconds?: number;
  /** Storage download URL for the uploaded track. Absent means metadata only. */
  uri?: string;
  /** Original filename, shown while picking. */
  fileName?: string;
};

export type EventMedia = {
  uri: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
  durationMs?: number;
};

export type AttendeeStatus = 'confirmed' | 'pending' | 'waitlisted' | 'declined';

export type AttendeeReason = 'approval' | 'waitlist' | 'direct' | 'payment' | 'promoted';

export type Attendee = {
  uid: string;
  name: string;
  photoURL?: string | null;
  avatar?: string;
  status: AttendeeStatus;
  /**
   * Why the participant is in their current status. This distinguishes the two
   * kinds of `pending`: waiting on the organizer ('approval') versus waiting on
   * their own payment ('payment'). The organizer must not be offered an
   * "approve" action for the latter.
   */
  reason?: AttendeeReason;
  joinedAt?: any;
  updatedAt?: any;
  paymentStatus?: 'pending' | 'completed' | 'not_required';
};

export type Event = {
  id: string | number;
  title: string;
  description?: string;
  type?: string;
  imageUrl?: string;
  organizer: Organizer;
  createdBy?: string;
  /** ISO timestamp for when the event starts. Authoritative since the date picker landed. */
  startsAt?: string | any;
  /** Derived from startsAt + durationMinutes at write time, for range queries. */
  endsAt?: string | any;
  durationMinutes?: number;
  /** @deprecated Legacy free-text fields kept for events created before `startsAt`. */
  time?: string;
  /** @deprecated see `startsAt` */
  date?: string;
  timeFlexible?: boolean;
  location?: string;
  latitude?: number;
  longitude?: number;
  attendees?: number;
  minAttendees?: number;
  maxAttendees?: number;
  tags?: string[];
  cost?: number; // in your default currency (e.g., USD)
  music?: EventMusic;
  media?: EventMedia[];
  requiresApproval?: boolean;
  attendeesList?: Attendee[];
  waitlistCount?: number;
  pendingCount?: number;
  status?: 'active' | 'cancelled';
  isFavorite?: boolean;
  isCommitted?: boolean;
  commitmentStatus?: 'pending' | 'approved' | null;
  commitmentReason?: 'approval' | 'waitlist' | 'direct';
  paymentStatus?: 'pending' | 'completed';
};

export type RatingQuality = {
  id: string;
  label: string;
  emoji: string;
  description: string;
};

/** One person rating one other person for one event. Id: `${eventId}_${raterUid}_${rateeUid}`. */
export type Rating = {
  id: string;
  eventId: string;
  eventTitle?: string;
  raterUid: string;
  rateeUid: string;
  /** Which direction the rating flows, used to bucket organizer vs attendee reputation. */
  rateeRole: 'organizer' | 'attendee';
  qualityId: string;
  qualityLabel: string;
  qualityEmoji: string;
  /** 1-5 stars, optional alongside the qualitative badge. */
  stars?: number;
  comment?: string;
  createdAt?: any;
};

/** Denormalised reputation stored on the user document. */
export type ReputationSummary = {
  ratingCount: number;
  averageStars: number;
  /** qualityId -> times awarded, used for the "Super Organized ×15" badges. */
  qualityCounts: Record<string, number>;
};
