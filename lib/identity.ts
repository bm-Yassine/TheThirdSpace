/**
 * Deterministic visual identity for a user.
 *
 * Everyone previously rendered the same 👤 glyph, which made lists of people
 * indistinguishable. A generated avatar has to be stable — the same person must
 * look the same on every screen and every device — so it is derived from their
 * uid rather than stored or randomised.
 *
 * The palette is drawn from the brand's indigo family plus warm counterweights,
 * so a wall of avatars still reads as one product.
 */

export type AvatarPalette = { from: string; to: string; ink: string };

/**
 * Curated pairs rather than generated hues: arbitrary HSL produces muddy or
 * low-contrast combinations, and white initials must stay legible on all of
 * them.
 */
const PALETTES: AvatarPalette[] = [
  { from: '#818CF8', to: '#4F46E5', ink: '#FFFFFF' }, // indigo — the brand
  { from: '#F472B6', to: '#DB2777', ink: '#FFFFFF' }, // pink
  { from: '#34D399', to: '#059669', ink: '#FFFFFF' }, // emerald
  { from: '#FBBF24', to: '#D97706', ink: '#FFFFFF' }, // amber
  { from: '#60A5FA', to: '#2563EB', ink: '#FFFFFF' }, // blue
  { from: '#A78BFA', to: '#7C3AED', ink: '#FFFFFF' }, // violet
  { from: '#FB7185', to: '#E11D48', ink: '#FFFFFF' }, // rose
  { from: '#2DD4BF', to: '#0D9488', ink: '#FFFFFF' }, // teal
  { from: '#FDBA74', to: '#EA580C', ink: '#FFFFFF' }, // orange
  { from: '#94A3B8', to: '#475569', ink: '#FFFFFF' }, // slate
];

/** FNV-1a: small, fast, and stable across platforms — unlike hashCode tricks. */
const hash = (value: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

export const paletteFor = (seed: string): AvatarPalette =>
  PALETTES[hash(seed || 'anonymous') % PALETTES.length];

/**
 * Up to two initials from a display name.
 * Falls back to the first alphanumeric character, then to a dash, so the
 * avatar never renders empty for an odd name.
 */
export const initialsFor = (name?: string | null): string => {
  const cleaned = (name || '').trim();
  if (!cleaned) return '·';

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }

  const letters = cleaned.replace(/[^\p{L}\p{N}]/gu, '');
  return letters.slice(0, 2).toUpperCase() || '·';
};

/** Slight rotation per user so identical initials still look distinct. */
export const angleFor = (seed: string): number => (hash(seed || 'anonymous') % 8) * 45;
