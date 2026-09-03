/**
 * Design tokens.
 *
 * The single reference for the values the interface is built from. Colours
 * previously drifted — the same grey appeared as #e5e5e5, #f0f0f0 and #e5e7eb
 * across different screens, and identical colours were written in two
 * different cases — which is invisible in any one file and obvious across the
 * app.
 *
 * These mirror `design/design-system/tokens.json`, which is the version
 * published with the case study.
 */

export const Palette = {
  /** Primary text, primary buttons, the Discover ground. */
  ink: '#111827',
  /** Body copy. */
  body: '#374151',
  /** Secondary text and icons. */
  muted: '#6b7280',
  mutedStrong: '#4b5563',
  /** Placeholders and disabled states. */
  subtle: '#9ca3af',

  /** Borders and dividers. */
  hairline: '#e5e7eb',
  border: '#d1d5db',

  /** Chips, ghost buttons. */
  surface: '#f3f4f6',
  /** Cards resting on white. */
  raised: '#f9fafb',
  white: '#ffffff',

  /** Brand. */
  accent: '#6366f1',
  accentDeep: '#4f46e5',
  accentDark: '#4338ca',
} as const;

/** Status colours. Each pair means the same thing on every screen. */
export const Status = {
  confirmed: { fill: '#dcfce7', border: '#bbf7d0', ink: '#15803d' },
  pending: { fill: '#eff6ff', border: '#bfdbfe', ink: '#2563eb' },
  attention: { fill: '#ffedd5', border: '#fed7aa', ink: '#b45309' },
  warning: { fill: '#fffbeb', border: '#fde68a', ink: '#92400e' },
  declined: { fill: '#fef2f2', border: '#fecaca', ink: '#dc2626' },
  organizer: { fill: '#eef2ff', border: '#c7d2fe', ink: '#4338ca' },
} as const;

export const Radius = {
  pill: 999,
  feature: 14,
  control: 12,
  tile: 10,
  input: 8,
} as const;

export const Space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  /** Standard screen gutter. */
  gutter: 16,
} as const;

/**
 * Screen header. Values drifted between 14, 16 and 18 across screens, which
 * made headers sit at slightly different heights as you navigated.
 */
export const Header = {
  paddingHorizontal: 16,
  paddingTop: 16,
  paddingBottom: 12,
} as const;

export const TypeScale = {
  screenTitle: { fontSize: 26, fontWeight: '700' },
  eventTitle: { fontSize: 22, fontWeight: '700' },
  sectionHeading: { fontSize: 15, fontWeight: '700' },
  body: { fontSize: 14, fontWeight: '400' },
  meta: { fontSize: 12, fontWeight: '400' },
  micro: { fontSize: 11, fontWeight: '600' },
} as const;

/** Minimum comfortable touch target, per the design system. */
export const TouchTarget = { min: 36, comfortable: 44 } as const;
