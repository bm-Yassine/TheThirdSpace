import { Platform, type ViewStyle } from 'react-native';

/**
 * The glass treatment used by the floating navigation, shared so every overlay
 * control on Discover matches it.
 *
 * Buttons and cards floating over photography were each inventing their own
 * translucency, border and shadow, so they read as separate components stacked
 * on the same screen rather than one system.
 *
 * backdropFilter only exists on web; on native the higher background opacity
 * carries the effect instead.
 */

const blur = (radius: number): ViewStyle =>
  Platform.OS === 'web' ? ({ backdropFilter: `blur(${radius}px)` } as unknown as ViewStyle) : {};

export const GlassShadow: ViewStyle = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 8,
};

/** Neutral surface: secondary buttons, audio controls, the details card. */
export const glassSurface = (options?: { strong?: boolean; radius?: number }): ViewStyle => ({
  backgroundColor: Platform.select({
    web: options?.strong ? 'rgba(17,24,39,0.44)' : 'rgba(255,255,255,0.16)',
    default: options?.strong ? 'rgba(17,24,39,0.66)' : 'rgba(255,255,255,0.26)',
  }),
  borderWidth: 1,
  borderColor: options?.strong ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.34)',
  ...blur(options?.strong ? 16 : 10),
  ...GlassShadow,
});

/** Primary action: the brand indigo, still glass so it belongs to the set. */
export const glassAccent = (): ViewStyle => ({
  backgroundColor: Platform.select({
    web: 'rgba(79,70,229,0.82)',
    default: 'rgba(79,70,229,0.94)',
  }),
  borderWidth: 1,
  borderColor: 'rgba(165,180,252,0.55)',
  ...blur(10),
  ...GlassShadow,
});
