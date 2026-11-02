import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Search, Play, Pause, Check, X, Music } from 'lucide-react-native';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { loadLibrary } from '../lib/musicLibrary';
import { availableMoods, byMood, creditLine, searchTracks, type LibraryTrack } from '../lib/musicLicence';

/**
 * Picking a soundtrack from the licence-clear library.
 *
 * Organizers could already upload audio, which puts the licensing burden on
 * them — so most events had no soundtrack at all. Choosing from a vetted
 * catalogue removes both the burden and the risk.
 *
 * Every track shows its licence, and anything under CC-BY shows its credit
 * inline, because that credit has to travel with the track wherever it plays.
 */
export default function MusicPicker({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (track: LibraryTrack) => void;
}) {
  const [tracks, setTracks] = useState<LibraryTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [mood, setMood] = useState<string | null>(null);
  const [queryText, setQueryText] = useState('');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [player, setPlayer] = useState<AudioPlayer | null>(null);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    loadLibrary()
      .then(setTracks)
      .catch(() => setTracks([]))
      .finally(() => setLoading(false));
  }, [visible]);

  // Previews must never outlive the sheet, or audio keeps playing behind it.
  const stopPreview = React.useCallback(() => {
    player?.remove();
    setPlayer(null);
    setPreviewId(null);
  }, [player]);

  useEffect(() => {
    if (!visible) stopPreview();
  }, [visible, stopPreview]);

  useEffect(() => () => {
    player?.remove();
  }, [player]);

  const preview = (track: LibraryTrack) => {
    if (previewId === track.id) {
      stopPreview();
      return;
    }
    player?.remove();
    try {
      const next = createAudioPlayer({ uri: track.uri });
      next.loop = true;
      next.play();
      setPlayer(next);
      setPreviewId(track.id);
    } catch {
      setPlayer(null);
      setPreviewId(null);
    }
  };

  const visibleTracks = useMemo(
    () => searchTracks(byMood(tracks, mood), queryText),
    [tracks, mood, queryText]
  );
  const moods = useMemo(() => availableMoods(tracks), [tracks]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Choose a soundtrack</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>

          <View style={styles.searchBox}>
            <Search size={16} color="#6b7280" />
            <TextInput
              value={queryText}
              onChangeText={setQueryText}
              placeholder="Search tracks"
              placeholderTextColor="#9ca3af"
              style={styles.searchInput}
            />
          </View>

          {moods.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.moodScroll}
              contentContainerStyle={styles.moodRow}
            >
              <Pressable
                onPress={() => setMood(null)}
                style={[styles.moodChip, mood === null && styles.moodChipOn]}
              >
                <Text style={[styles.moodText, mood === null && styles.moodTextOn]}>All</Text>
              </Pressable>
              {moods.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setMood(item === mood ? null : item)}
                  style={[styles.moodChip, mood === item && styles.moodChipOn]}
                >
                  <Text style={[styles.moodText, mood === item && styles.moodTextOn]}>{item}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
            {loading && (
              <View style={styles.state}>
                <ActivityIndicator color="#6366f1" />
              </View>
            )}

            {!loading && tracks.length === 0 && (
              <View style={styles.state}>
                <Music size={26} color="#9ca3af" />
                <Text style={styles.stateTitle}>The library is empty</Text>
                <Text style={styles.stateBody}>
                  No tracks have been added yet. You can still attach your own audio file.
                </Text>
              </View>
            )}

            {!loading && tracks.length > 0 && visibleTracks.length === 0 && (
              <View style={styles.state}>
                <Text style={styles.stateBody}>Nothing matches that search.</Text>
              </View>
            )}

            {visibleTracks.map((track) => {
              const credit = creditLine(track);
              return (
                <View key={track.id} style={styles.row}>
                  <Pressable onPress={() => preview(track)} style={styles.playBtn} hitSlop={6}>
                    {previewId === track.id ? (
                      <Pause size={16} color="#4f46e5" />
                    ) : (
                      <Play size={16} color="#4f46e5" />
                    )}
                  </Pressable>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>{track.title}</Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {track.artist} · {track.mood}
                      {track.licence === 'CC0' || track.licence === 'PUBLIC_DOMAIN'
                        ? ' · no credit needed'
                        : ''}
                    </Text>
                    {/* A CC-BY credit must travel with the track. */}
                    {!!credit && (
                      <Text style={styles.credit} numberOfLines={2}>{credit}</Text>
                    )}
                  </View>

                  <Pressable
                    onPress={() => {
                      stopPreview();
                      onSelect(track);
                      onClose();
                    }}
                    style={styles.useBtn}
                  >
                    <Check size={14} color="#ffffff" />
                    <Text style={styles.useText}>Use</Text>
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(17,24,39,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 26,
    maxHeight: '86%',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  title: { fontSize: 17, fontWeight: '700', color: '#111827' },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111827', padding: 0 },

  moodScroll: { flexGrow: 0, flexShrink: 0 },
  moodRow: { gap: 7, paddingVertical: 12, paddingRight: 8, alignItems: 'center' },
  moodChip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  moodChipOn: { backgroundColor: '#111827', borderColor: '#111827' },
  moodText: { fontSize: 12.5, fontWeight: '600', color: '#374151' },
  moodTextOn: { color: '#ffffff' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f3f4f6',
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  rowMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  credit: { fontSize: 11, color: '#9ca3af', marginTop: 3, fontStyle: 'italic' },

  useBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  useText: { fontSize: 12.5, fontWeight: '700', color: '#ffffff' },

  state: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  stateTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginTop: 10 },
  stateBody: { fontSize: 13, color: '#6b7280', textAlign: 'center', marginTop: 6, lineHeight: 19 },
});
