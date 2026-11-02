import React, { useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Check, Search, X } from 'lucide-react-native';

import { CATEGORIES } from '../lib/taxonomy';
import {
  Cover,
  CoverCategory,
  COVERS,
  coverUrl,
  searchCovers,
} from '../lib/coverLibrary';
import { Palette, Radius, Space } from '../constants/design';

/**
 * Picking a cover image from the library.
 *
 * Mirrors MusicPicker so the two media choices in event creation behave the
 * same way. Opens filtered to the event's own category, because that is
 * almost always where the right picture is.
 */
export default function CoverPicker({
  visible,
  onClose,
  onSelect,
  selectedId,
  initialCategory,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (cover: Cover) => void;
  selectedId?: string;
  initialCategory?: CoverCategory | null;
}) {
  const [queryText, setQueryText] = useState('');
  const [category, setCategory] = useState<CoverCategory | null>(initialCategory ?? null);

  // Reopening after the organizer changes the event type should land on the
  // new type, not on whatever was browsed last time.
  React.useEffect(() => {
    if (visible) {
      setCategory(initialCategory ?? null);
      setQueryText('');
    }
  }, [visible, initialCategory]);

  const visibleCovers = useMemo(() => {
    const searched = queryText.trim() ? searchCovers(queryText) : COVERS;
    // A search is a deliberate act — let it reach outside the category filter.
    return queryText.trim() || !category
      ? searched
      : searched.filter((cover) => cover.category === category);
  }, [queryText, category]);

  const categoriesWithCovers = useMemo(
    () => CATEGORIES.filter((item) => COVERS.some((cover) => cover.category === item.id)),
    []
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Choose a cover</Text>
            <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Close">
              <X size={20} color={Palette.muted} />
            </Pressable>
          </View>

          <View style={styles.searchBox}>
            <Search size={16} color={Palette.muted} />
            <TextInput
              value={queryText}
              onChangeText={setQueryText}
              placeholder="Search covers"
              placeholderTextColor={Palette.subtle}
              style={styles.searchInput}
            />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterRow}
          >
            <Pressable
              onPress={() => setCategory(null)}
              style={[styles.chip, category === null && styles.chipOn]}
            >
              <Text style={[styles.chipText, category === null && styles.chipTextOn]}>All</Text>
            </Pressable>
            {categoriesWithCovers.map((item) => (
              <Pressable
                key={item.id}
                onPress={() =>
                  setCategory(item.id === category ? null : (item.id as CoverCategory))
                }
                style={[styles.chip, category === item.id && styles.chipOn]}
              >
                <Text style={[styles.chipText, category === item.id && styles.chipTextOn]}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.grid}>
            {visibleCovers.length === 0 ? (
              <Text style={styles.empty}>No covers match that. Try another word.</Text>
            ) : (
              visibleCovers.map((cover) => {
                const chosen = cover.id === selectedId;
                return (
                  <Pressable
                    key={cover.id}
                    onPress={() => onSelect(cover)}
                    style={styles.tile}
                    accessibilityRole="button"
                    accessibilityLabel={cover.label}
                  >
                    <Image
                      source={{ uri: coverUrl(cover, 'thumb') }}
                      style={styles.thumb}
                      resizeMode="cover"
                    />
                    {chosen && (
                      <View style={styles.chosen}>
                        <Check size={16} color={Palette.white} />
                      </View>
                    )}
                    <Text style={styles.caption} numberOfLines={1}>
                      {cover.label}
                    </Text>
                  </Pressable>
                );
              })
            )}

            <Text style={styles.licence}>
              Photos from Unsplash, free to use under the Unsplash License.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(17,24,39,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Palette.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 26,
    maxHeight: '86%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: { fontSize: 17, fontWeight: '700', color: Palette.ink },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    backgroundColor: Palette.surface,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: Palette.ink, padding: 0 },

  // Without flexGrow the row takes a share of the sheet's spare height, and
  // without alignItems the chips then stretch to fill it as tall vertical
  // pills. Both are needed for a row of chips that sits on one line.
  filterScroll: { flexGrow: 0, flexShrink: 0 },
  filterRow: { gap: 7, paddingVertical: 12, paddingRight: 8, alignItems: 'center' },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  chipOn: { backgroundColor: Palette.ink, borderColor: Palette.ink },
  chipText: { fontSize: 12, fontWeight: '600', color: Palette.mutedStrong },
  chipTextOn: { color: Palette.white },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.sm,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  tile: { width: '48%', marginBottom: Space.md },
  thumb: {
    width: '100%',
    aspectRatio: 3 / 2,
    borderRadius: Radius.tile,
    backgroundColor: Palette.surface,
  },
  chosen: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Palette.accentDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: { fontSize: 11, color: Palette.muted, marginTop: 4 },

  empty: { fontSize: 13, color: Palette.muted, paddingVertical: 24, textAlign: 'center', width: '100%' },
  licence: { fontSize: 11, color: Palette.subtle, width: '100%', marginTop: 4 },
});
