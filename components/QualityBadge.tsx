import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Award } from 'lucide-react-native';
import { findQuality } from '../lib/ratingQualities';

/**
 * A quality someone has been awarded, e.g. "Super Organized ×15".
 *
 * Resolves the icon from the shared quality list so a badge looks identical
 * wherever it appears. Falls back to a generic award glyph for a quality id
 * that no longer exists, rather than rendering a broken row.
 */
export default function QualityBadge({
  qualityKey,
  count,
  size = 'md',
}: {
  qualityKey: string;
  count?: number;
  size?: 'sm' | 'md';
}) {
  const quality = findQuality(qualityKey);
  const Icon = quality?.Icon ?? Award;
  const [background, foreground] = quality?.tint ?? ['#f3f4f6', '#4b5563'];
  const label = quality?.label ?? qualityKey;

  const compact = size === 'sm';

  return (
    <View style={[styles.badge, { backgroundColor: background }, compact && styles.badgeCompact]}>
      <Icon size={compact ? 12 : 14} color={foreground} />
      <Text style={[styles.label, { color: foreground }, compact && styles.labelCompact]}>
        {label}
        {typeof count === 'number' ? ` ×${count}` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeCompact: { paddingHorizontal: 9, paddingVertical: 4, gap: 5 },
  label: { fontSize: 12.5, fontWeight: '700' },
  labelCompact: { fontSize: 11.5 },
});
