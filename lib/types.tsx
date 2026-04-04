export type Organizer = {
  uid?: string;
  name: string;
  avatar?: string;
  photoURL?: string | null;
};

export type EventMusic = {
  title: string;
  artist?: string;
  startAtSeconds?: number;
};

export type EventMedia = {
  uri: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
  durationMs?: number;
};

export type Event = {
  id: string | number;
  title: string;
  description?: string;
  type?: string;
  imageUrl?: string;
  organizer: Organizer;
  time?: string;
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
  isFavorite?: boolean;
  isCommitted?: boolean;
  commitmentStatus?: 'pending' | 'approved' | null;
  commitmentReason?: 'approval' | 'waitlist' | 'direct';
  paymentStatus?: 'pending' | 'completed';
};
