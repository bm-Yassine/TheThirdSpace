/**
 * The cover image library.
 *
 * Organizers could already upload photos, but an event made in thirty seconds
 * rarely has one — and every event without a photo fell back to the same
 * hardcoded stock image, so an imageless feed was a wall of identical cards.
 * This is a catalogue to pick from, and a sensible automatic choice when the
 * organizer picks nothing.
 *
 * Unlike the music library, this ships in code rather than in Firestore. Audio
 * has to be copied into our own Storage bucket because free-music hosts forbid
 * hotlinking, which means a catalogue that can only grow at runtime. Images
 * here are served from Unsplash's CDN, which is what the Unsplash License
 * expects, so there is nothing to host and no reason to make the app read the
 * catalogue over the network before it can show a picker.
 *
 * Every URL in this file was checked to resolve, and every image was looked at
 * to confirm it shows what its category claims.
 *
 * Images: Unsplash License (https://unsplash.com/license) — free to use,
 * commercially, without permission or attribution.
 */

/** Matches `InterestCategory['id']` in taxonomy.ts. */
export type CoverCategory =
  | 'music'
  | 'food'
  | 'sports'
  | 'arts'
  | 'outdoor'
  | 'wellness'
  | 'learning'
  | 'tech'
  | 'games'
  | 'social'
  | 'making'
  | 'wellbeing';

export type Cover = {
  id: string;
  category: CoverCategory;
  /** Describes the picture — the picker's alt text, and what search matches. */
  label: string;
};

const UNSPLASH = 'https://images.unsplash.com/';

/**
 * Sized on request rather than stored at one size: a feed card and a grid
 * thumbnail want very different numbers of bytes, and the CDN does the resize.
 */
export const coverUrl = (cover: Cover, size: 'thumb' | 'card' | 'full' = 'card'): string => {
  const dimensions =
    size === 'thumb' ? 'w=240&h=160' : size === 'full' ? 'w=1200&h=630' : 'w=800&h=1000';
  return `${UNSPLASH}${cover.id}?${dimensions}&fit=crop&auto=format&q=80`;
};

export const COVERS: Cover[] = [
  { id: 'photo-1470225620780-dba8ba36b745', category: 'music', label: 'DJ decks at night' },
  { id: 'photo-1514525253161-7a46d19cd819', category: 'music', label: 'Concert crowd and lights' },
  { id: 'photo-1511671782779-c97d3d27a1d4', category: 'music', label: 'Vintage microphone' },

  { id: 'photo-1504674900247-0877df9cc836', category: 'food', label: 'Dishes laid out to share' },
  { id: 'photo-1414235077428-338989a2e8c0', category: 'food', label: 'Dinner table set for guests' },
  { id: 'photo-1555396273-367ea4eb4db5', category: 'food', label: 'Restaurant dining room' },

  { id: 'photo-1517649763962-0c623066013b', category: 'sports', label: 'Cyclists racing' },
  { id: 'photo-1552674605-db6ffd4facb5', category: 'sports', label: 'Runners at dusk' },
  { id: 'photo-1546519638-68e109498ffc', category: 'sports', label: 'Basketball at the hoop' },

  { id: 'photo-1452587925148-ce544e77e70d', category: 'arts', label: 'Camera and photo prints' },
  { id: 'photo-1536924940846-227afb31e2a5', category: 'arts', label: 'Painted mural' },
  { id: 'photo-1460661419201-fd4cecdf8a8b', category: 'arts', label: 'Stacked painted canvases' },

  { id: 'photo-1506905925346-21bda4d32df4', category: 'outdoor', label: 'Mountains and still water' },
  { id: 'photo-1551632811-561732d1e306', category: 'outdoor', label: 'Hiker on a trail' },
  { id: 'photo-1507525428034-b723cf961d3e', category: 'outdoor', label: 'Beach and clear sea' },

  { id: 'photo-1571019613454-1cb2f99b2d8b', category: 'wellness', label: 'Exercising on a mat' },
  { id: 'photo-1544367567-0f2fcb009e0b', category: 'wellness', label: 'Yoga pose at sunset' },
  { id: 'photo-1506126613408-eca07ce68773', category: 'wellness', label: 'Meditating by the water' },

  { id: 'photo-1522202176988-66273c2fd55f', category: 'learning', label: 'Working together at a laptop' },
  { id: 'photo-1540575467063-178a50c2df87', category: 'learning', label: 'Audience at a talk' },
  { id: 'photo-1524178232363-1fb2b075b655', category: 'learning', label: 'Seminar room' },

  { id: 'photo-1498050108023-c5249f4df085', category: 'tech', label: 'Code on a laptop screen' },
  { id: 'photo-1551288049-bebda4e38f71', category: 'tech', label: 'Charts on a dashboard' },
  { id: 'photo-1517048676732-d65bc937f952', category: 'tech', label: 'Team around a table' },

  { id: 'photo-1610890716171-6b1bb98ffd09', category: 'games', label: 'Board game in play' },
  { id: 'photo-1611996575749-79a3a250f948', category: 'games', label: 'Letter dice' },
  { id: 'photo-1550745165-9bc0b252726f', category: 'games', label: 'Retro arcade machines' },

  { id: 'photo-1511632765486-a01980e01a18', category: 'social', label: 'Friends at sunset' },
  { id: 'photo-1529156069898-49953e39b3ac', category: 'social', label: 'Group of friends outdoors' },
  { id: 'photo-1543007630-9710e4a00a20', category: 'social', label: 'Bar interior' },

  { id: 'photo-1558618666-fcd25c85cd64', category: 'making', label: 'Working at a bench' },
  { id: 'photo-1452860606245-08befc0ff44b', category: 'making', label: 'Craft tools and thread' },
  { id: 'photo-1605883705077-8d3d3cebe78c', category: 'making', label: 'Hand-thrown ceramics' },

  { id: 'photo-1593113646773-028c64a8f1b8', category: 'wellbeing', label: 'Handing out supplies' },
  { id: 'photo-1517486808906-6ca8b3f04846', category: 'wellbeing', label: 'Volunteers in a field' },
  { id: 'photo-1582213782179-e0d53f98f2ca', category: 'wellbeing', label: 'Hands joined in a circle' },
];

export const coversFor = (category: CoverCategory | null): Cover[] =>
  category ? COVERS.filter((cover) => cover.category === category) : COVERS;

export const findCover = (id: string): Cover | undefined =>
  COVERS.find((cover) => cover.id === id);

/** True when this URL came from the library, whatever size was requested. */
export const isLibraryCover = (url: string | undefined): boolean =>
  !!url && url.startsWith(UNSPLASH) && COVERS.some((cover) => url.includes(cover.id));

export const searchCovers = (text: string): Cover[] => {
  const needle = text.trim().toLowerCase();
  if (!needle) return COVERS;
  return COVERS.filter(
    (cover) =>
      cover.label.toLowerCase().includes(needle) || cover.category.includes(needle)
  );
};

/**
 * A stable integer from a string, so the same event always gets the same
 * cover. Picking at random would reshuffle the feed on every render.
 */
const hash = (value: string): number => {
  let result = 0;
  for (let index = 0; index < value.length; index++) {
    result = (result * 31 + value.charCodeAt(index)) >>> 0;
  }
  return result;
};

/**
 * The automatic choice for an event with no photo of its own: a cover from its
 * own category, varied by a seed so that two cycling events do not look like
 * the same event posted twice.
 */
export const suggestCover = (input: {
  categoryId?: string | null;
  seed?: string;
}): Cover => {
  const pool = COVERS.filter((cover) => cover.category === input.categoryId);
  const candidates = pool.length > 0 ? pool : COVERS;
  return candidates[hash(input.seed || '') % candidates.length];
};
