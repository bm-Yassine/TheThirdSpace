import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Search, SlidersHorizontal, X } from 'lucide-react-native';
import {
  activeFilterCount,
  collectTags,
  collectTypes,
  emptyFilters,
  type DateBand,
  type EventFilters,
  type PriceBand,
} from '../lib/eventFilters';
import type { Event } from '../lib/types';

/**
 * Search and filter controls for the Cards view.
 *
 * Deliberately not used on Discover: that feed's ordering is reserved for the
 * recommendation engine, and a filter bar over a full-bleed immersive card
 * would fight the design.
 *
 * The filter options are derived from the events actually in the feed, so the
 * UI never offers a tag that would return nothing.
 */

const PRICE_OPTIONS: { value: PriceBand; label: string }[] = [
  { value: 'any', label: 'Any price' },
  { value: 'free', label: 'Free' },
  { value: 'under15', label: 'Under $15' },
  { value: 'under50', label: 'Under $50' },
];

const DATE_OPTIONS: { value: DateBand; label: string }[] = [
  { value: 'any', label: 'Anytime' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
];

export default function EventFilterBar({
  events,
  filters,
  onChange,
  resultCount,
}: {
  events: Event[];
  filters: EventFilters;
  onChange: (next: EventFilters) => void;
  resultCount: number;
}) {
  const [expanded, setExpanded] = useState(false);

  const tags = useMemo(() => collectTags(events, 14), [events]);
  const types = useMemo(() => collectTypes(events), [events]);
  const count = activeFilterCount(filters);

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  return (
    <View style={styles.wrap}>
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Search size={16} color="#6b7280" />
          <TextInput
            value={filters.query}
            onChangeText={(query) => onChange({ ...filters, query })}
            placeholder="Search events, places, people"
            placeholderTextColor="#9ca3af"
            style={styles.searchInput}
            returnKeyType="search"
            autoCorrect={false}
          />
          {!!filters.query && (
            <Pressable onPress={() => onChange({ ...filters, query: '' })} hitSlop={8}>
              <X size={15} color="#6b7280" />
            </Pressable>
          )}
        </View>

        <Pressable
          onPress={() => setExpanded((open) => !open)}
          style={[styles.filterBtn, (expanded || count > 0) && styles.filterBtnActive]}
        >
          <SlidersHorizontal size={16} color={expanded || count > 0 ? '#fff' : '#374151'} />
          {count > 0 && (
            <View style={styles.countPip}>
              <Text style={styles.countPipText}>{count}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {expanded && (
        <View style={styles.panel}>
          <FilterGroup label="When">
            {DATE_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={filters.date === option.value}
                onPress={() => onChange({ ...filters, date: option.value })}
              />
            ))}
          </FilterGroup>

          <FilterGroup label="Price">
            {PRICE_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={filters.price === option.value}
                onPress={() => onChange({ ...filters, price: option.value })}
              />
            ))}
          </FilterGroup>

          {types.length > 0 && (
            <FilterGroup label="Type">
              {types.map((type) => (
                <Chip
                  key={type}
                  label={type}
                  selected={filters.types.includes(type)}
                  onPress={() => onChange({ ...filters, types: toggle(filters.types, type) })}
                />
              ))}
            </FilterGroup>
          )}

          {tags.length > 0 && (
            <FilterGroup label="Tags">
              {tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  selected={filters.tags.includes(tag)}
                  onPress={() => onChange({ ...filters, tags: toggle(filters.tags, tag) })}
                />
              ))}
            </FilterGroup>
          )}

          <View style={styles.panelFooter}>
            <Text style={styles.resultText}>
              {resultCount} event{resultCount === 1 ? '' : 's'}
            </Text>
            {count > 0 && (
              <Pressable onPress={() => onChange(emptyFilters)} hitSlop={6}>
                <Text style={styles.clearText}>Clear all</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.groupLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {children}
      </ScrollView>
    </View>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 14,
    paddingTop: 56,
    paddingBottom: 6,
    // Sits above the view selector (zIndex 40) so the expanded panel covers it
    // rather than being overlapped. While you are filtering, the panel is the
    // thing you are interacting with.
    zIndex: 50,
  },

  searchRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    // Clears the view selector column on the right (36px + 16px margin).
    paddingRight: 48,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111827', padding: 0 },

  filterBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  filterBtnActive: { backgroundColor: '#111827' },
  countPip: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countPipText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  panel: {
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 16,
    padding: 14,
  },
  groupLabel: { fontSize: 12, fontWeight: '700', color: '#6b7280', marginBottom: 7 },
  chipRow: { gap: 7, paddingRight: 8 },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  chipSelected: { backgroundColor: '#111827', borderColor: '#111827' },
  chipText: { fontSize: 12.5, color: '#374151', fontWeight: '600' },
  chipTextSelected: { color: '#fff' },

  panelFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
    paddingTop: 11,
    marginTop: 2,
  },
  resultText: { fontSize: 13, color: '#374151', fontWeight: '600' },
  clearText: { fontSize: 13, color: '#4f46e5', fontWeight: '700' },
});
