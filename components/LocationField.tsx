import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { MapPin, Check, X } from 'lucide-react-native';
import { searchPlaces, type GeoBias, type PlaceSuggestion } from '../lib/geocoding';

/**
 * Location input that resolves what the user types into real coordinates.
 *
 * A free-text location field is why nothing created in the app ever showed up
 * on the map. Picking a suggestion here attaches a latitude and longitude to
 * the event.
 *
 * Free text is still allowed — someone may be meeting somewhere unlisted — but
 * the field says plainly when an event will not be mappable.
 */

export type LocationValue = {
  label: string;
  latitude?: number;
  longitude?: number;
};

const DEBOUNCE_MS = 450;

export default function LocationField({
  value,
  onChange,
  bias,
}: {
  value: LocationValue;
  onChange: (next: LocationValue) => void;
  bias?: GeoBias;
}) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<any>(null);
  // Suppresses the search that a programmatic setText would otherwise trigger
  // right after the user picks a suggestion.
  const skipNextSearch = useRef(false);

  const runSearch = useCallback(
    async (query: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setSearching(true);
      setError(null);
      try {
        const results = await searchPlaces(query, { bias, signal: controller.signal });
        if (controller.signal.aborted) return;
        setSuggestions(results);
        setOpen(true);
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        setError('Could not reach the place lookup. You can still type an address.');
        setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    },
    [bias]
  );

  useEffect(() => () => {
    abortRef.current?.abort();
    clearTimeout(timerRef.current);
  }, []);

  const onChangeText = (text: string) => {
    // Typing after a pick invalidates the coordinates that came with it.
    onChange({ label: text, latitude: undefined, longitude: undefined });

    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }

    clearTimeout(timerRef.current);
    if (text.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    // Debounced to respect Nominatim's one-request-per-second policy.
    timerRef.current = setTimeout(() => runSearch(text), DEBOUNCE_MS);
  };

  const pick = (suggestion: PlaceSuggestion) => {
    skipNextSearch.current = true;
    onChange({
      label: suggestion.name,
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
    });
    setSuggestions([]);
    setOpen(false);
  };

  const hasCoordinates = value.latitude !== undefined && value.longitude !== undefined;

  return (
    <View>
      <View style={[styles.inputRow, hasCoordinates && styles.inputRowResolved]}>
        <MapPin size={16} color={hasCoordinates ? '#15803d' : '#6b7280'} />
        <TextInput
          value={value.label}
          onChangeText={onChangeText}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder="Search a place, address or venue"
          placeholderTextColor="#9ca3af"
          style={styles.input}
          autoCorrect={false}
        />
        {searching && <ActivityIndicator size="small" color="#6b7280" />}
        {!searching && hasCoordinates && <Check size={16} color="#15803d" />}
        {!searching && !hasCoordinates && !!value.label && (
          <Pressable
            onPress={() => onChange({ label: '', latitude: undefined, longitude: undefined })}
            hitSlop={8}
          >
            <X size={15} color="#9ca3af" />
          </Pressable>
        )}
      </View>

      {open && suggestions.length > 0 && (
        <View style={styles.suggestions}>
          {suggestions.map((suggestion) => (
            <Pressable
              key={suggestion.id}
              onPress={() => pick(suggestion)}
              style={styles.suggestion}
            >
              <MapPin size={14} color="#6b7280" />
              <View style={{ flex: 1 }}>
                <Text style={styles.suggestionName} numberOfLines={1}>
                  {suggestion.name}
                </Text>
                <Text style={styles.suggestionAddress} numberOfLines={1}>
                  {suggestion.address}
                </Text>
              </View>
            </Pressable>
          ))}
          <Text style={styles.attribution}>Places from OpenStreetMap</Text>
        </View>
      )}

      {!!error && <Text style={styles.warning}>{error}</Text>}

      {!hasCoordinates && value.label.trim().length > 0 && !open && (
        <Text style={styles.warning}>
          Pick a suggestion to put this event on the map. Free text works, but it
          won&apos;t appear in the map view.
        </Text>
      )}

      {hasCoordinates && (
        <Text style={styles.resolved}>Location set — this event will appear on the map.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 10,
    backgroundColor: '#f9fafb',
  },
  inputRowResolved: { borderColor: '#86efac', backgroundColor: '#f0fdf4' },
  input: { flex: 1, fontSize: 14, color: '#111827', padding: 0 },

  suggestions: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f3f4f6',
  },
  suggestionName: { fontSize: 14, color: '#111827', fontWeight: '600' },
  suggestionAddress: { fontSize: 11.5, color: '#6b7280', marginTop: 1 },
  attribution: { fontSize: 10, color: '#9ca3af', padding: 8, textAlign: 'right' },

  warning: { fontSize: 11.5, color: '#b45309', marginTop: 6, lineHeight: 16 },
  resolved: { fontSize: 11.5, color: '#15803d', marginTop: 6, fontWeight: '600' },
});
