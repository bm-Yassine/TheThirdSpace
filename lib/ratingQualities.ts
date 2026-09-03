import {
  ClipboardCheck,
  HeartHandshake,
  Zap,
  MessagesSquare,
  Target,
  HandHeart,
  Smile,
  Handshake,
  Clock4,
  Sparkles,
  type LucideIcon,
} from 'lucide-react-native';

/**
 * The qualities people award each other after an event.
 *
 * Single source of truth: these were previously duplicated inside the rating
 * screen, so reputation badges elsewhere could not render the same icon or
 * wording.
 *
 * Icons are line glyphs from the same family as the rest of the app rather
 * than emoji. Emoji render differently on every platform, cannot be tinted,
 * and read as decoration; these carry the product's own visual language.
 * `emoji` is kept only so ratings written before this change still display.
 */

export type Quality = {
  id: string;
  label: string;
  description: string;
  Icon: LucideIcon;
  /** Tint pair: [background, foreground]. */
  tint: [string, string];
  /** @deprecated legacy glyph, retained for ratings stored before icons. */
  emoji: string;
};

export const ORGANIZER_QUALITIES: Quality[] = [
  {
    id: 'organized',
    label: 'Super Organized',
    description: 'Everything was perfectly planned',
    Icon: ClipboardCheck,
    tint: ['#EEF2FF', '#4F46E5'],
    emoji: '📋',
  },
  {
    id: 'welcoming',
    label: 'Very Welcoming',
    description: 'Made everyone feel included',
    Icon: HeartHandshake,
    tint: ['#FCE7F3', '#DB2777'],
    emoji: '🤗',
  },
  {
    id: 'energetic',
    label: 'High Energy',
    description: 'Brought great energy to the event',
    Icon: Zap,
    tint: ['#FEF3C7', '#D97706'],
    emoji: '⚡',
  },
  {
    id: 'communicative',
    label: 'Great Communicator',
    description: 'Kept everyone in the loop',
    Icon: MessagesSquare,
    tint: ['#DBEAFE', '#2563EB'],
    emoji: '💬',
  },
];

export const ATTENDEE_QUALITIES: Quality[] = [
  {
    id: 'engaged',
    label: 'Highly Engaged',
    description: 'Actively participated throughout',
    Icon: Target,
    tint: ['#EEF2FF', '#4F46E5'],
    emoji: '🎯',
  },
  {
    id: 'respectful',
    label: 'Very Respectful',
    description: 'Respectful of others and the guidelines',
    Icon: HandHeart,
    tint: ['#DCFCE7', '#059669'],
    emoji: '🙏',
  },
  {
    id: 'positive',
    label: 'Positive Energy',
    description: 'Brought great vibes to the group',
    Icon: Smile,
    tint: ['#FEF3C7', '#D97706'],
    emoji: '😊',
  },
  {
    id: 'helpful',
    label: 'Super Helpful',
    description: 'Helped others and contributed',
    Icon: Handshake,
    tint: ['#CCFBF1', '#0D9488'],
    emoji: '🤝',
  },
  {
    id: 'punctual',
    label: 'Always Punctual',
    description: 'On time and ready to go',
    Icon: Clock4,
    tint: ['#DBEAFE', '#2563EB'],
    emoji: '⏰',
  },
  {
    id: 'enthusiastic',
    label: 'Very Enthusiastic',
    description: 'Showed genuine enthusiasm',
    Icon: Sparkles,
    tint: ['#FCE7F3', '#DB2777'],
    emoji: '🌟',
  },
];

const ALL = [...ORGANIZER_QUALITIES, ...ATTENDEE_QUALITIES];

/**
 * Looks a quality up by id, or by label for reputation counts that were
 * aggregated by label before ids were stored.
 */
export const findQuality = (key?: string | null): Quality | undefined => {
  if (!key) return undefined;
  return ALL.find((quality) => quality.id === key || quality.label === key);
};

export const qualitiesFor = (role: 'organizer' | 'attendee') =>
  role === 'organizer' ? ORGANIZER_QUALITIES : ATTENDEE_QUALITIES;
