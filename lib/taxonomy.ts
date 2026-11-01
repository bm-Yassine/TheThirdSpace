/**
 * The shared vocabulary of interests, event types and tags.
 *
 * These were previously hardcoded in the create screen only, so an interest a
 * user picked and a tag an organizer typed could never reliably match — which
 * silently weakened the recommender, since its strongest signal is exactly
 * that overlap. One list, used by onboarding, event creation and ranking.
 */

export type InterestCategory = {
  id: string;
  /** Shown to users, and stored on the profile and on events. */
  label: string;
  /** Tags an event in this category typically carries. */
  related: string[];
};

export const CATEGORIES: InterestCategory[] = [
  { id: 'music', label: 'Music', related: ['Live Music', 'Concert', 'DJ', 'Jazz', 'Gig', 'Nightlife'] },
  { id: 'food', label: 'Food & Drink', related: ['Dinner', 'Supper Club', 'Cooking', 'Wine', 'Coffee', 'Brunch'] },
  { id: 'sports', label: 'Sports', related: ['Running', 'Football', 'Climbing', 'Cycling', 'Yoga', 'Swimming'] },
  { id: 'arts', label: 'Arts & Culture', related: ['Exhibition', 'Gallery', 'Theatre', 'Film', 'Museum', 'Photography'] },
  { id: 'outdoor', label: 'Outdoor', related: ['Hiking', 'Park', 'Beach', 'Garden', 'Picnic', 'Walking'] },
  { id: 'wellness', label: 'Health & Wellness', related: ['Yoga', 'Meditation', 'Running', 'Pilates', 'Wellbeing'] },
  { id: 'learning', label: 'Learning', related: ['Workshop', 'Talk', 'Language', 'Book Club', 'Course'] },
  { id: 'tech', label: 'Technology', related: ['Hackathon', 'Meetup', 'Startup', 'Coding', 'AI'] },
  { id: 'games', label: 'Games', related: ['Board Games', 'Chess', 'Trivia', 'Gaming', 'Pub Quiz'] },
  { id: 'social', label: 'Social', related: ['Drinks', 'Meetup', 'Party', 'Hangout', 'Networking'] },
  { id: 'making', label: 'Making', related: ['Ceramics', 'Craft', 'Woodwork', 'Painting', 'Sewing'] },
  { id: 'wellbeing', label: 'Volunteering', related: ['Community', 'Charity', 'Clean-up', 'Mutual Aid'] },
];

/** The event-type picker in event creation. */
export const EVENT_TYPES = CATEGORIES.map((category) => category.label);

/** Every tag the app knows about, for suggestions and autocomplete. */
export const ALL_TAGS = Array.from(
  new Set(CATEGORIES.flatMap((category) => [category.label, ...category.related]))
).sort();

const normalise = (value: string) => value.trim().toLowerCase();

export const categoryByLabel = (label?: string | null) =>
  CATEGORIES.find((category) => normalise(category.label) === normalise(label || ''));

/**
 * Tags worth offering for an event, inferred from what the organizer has
 * already typed. Ordered by how strongly each is implied, so the first few
 * chips are usually the right ones.
 */
export const suggestTags = (input: {
  title?: string;
  description?: string;
  type?: string;
  limit?: number;
}): string[] => {
  const limit = input.limit ?? 8;
  const haystack = normalise([input.title, input.description].filter(Boolean).join(' '));
  const scored = new Map<string, number>();

  const bump = (tag: string, by: number) =>
    scored.set(tag, (scored.get(tag) || 0) + by);

  // The chosen type is the strongest hint: offer its own label and its family.
  const typeCategory = categoryByLabel(input.type);
  if (typeCategory) {
    bump(typeCategory.label, 10);
    typeCategory.related.forEach((tag, index) => bump(tag, 6 - index * 0.1));
  }

  // Anything literally mentioned in the title or description.
  if (haystack) {
    ALL_TAGS.forEach((tag) => {
      const needle = normalise(tag);
      // Word-boundary match, so "art" does not fire on "party".
      const pattern = new RegExp(`(^|[^a-z])${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`);
      if (pattern.test(haystack)) bump(tag, 8);
    });
  }

  return [...scored.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([tag]) => tag);
};

/**
 * Tags implied by a set of interests, used to widen what the recommender
 * counts as a match: someone who likes "Music" should match an event tagged
 * only "Live Music".
 */
export const expandInterests = (interests: string[]): string[] => {
  const expanded = new Set<string>();
  interests.forEach((interest) => {
    expanded.add(interest);
    const category = categoryByLabel(interest);
    category?.related.forEach((tag) => expanded.add(tag));
  });
  return [...expanded];
};
