export type Organizer = {
  name: string;
  avatar?: string;
};

export type Event = {
  id: string | number;
  title: string;
  description?: string;
  imageUrl?: string;
  organizer: Organizer;
  time?: string;
  date?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  attendees?: number;
  maxAttendees?: number;
  tags?: string[];
  cost?: number; // in your default currency (e.g., USD)
  requiresApproval?: boolean;
  isFavorite?: boolean;
  isCommitted?: boolean;
  commitmentStatus?: 'pending' | 'approved' | null;
};
