import React, { useMemo, useRef } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';

/**
 * Cross-platform date/time/duration picker.
 *
 * Deliberately built from plain views rather than a native picker module:
 * this app ships to web, iOS and Android from one codebase, and
 * @react-native-community/datetimepicker has no web implementation. Scrollable
 * chips also suit the domain — events are almost always within the next
 * couple of months.
 */

const DAYS_AHEAD = 90;
const MINUTE_STEP = 15;

export type EventSchedule = {
  /** Local calendar day, `YYYY-MM-DD`. */
  date: string;
  /** 24h local time, `HH:mm`. */
  time: string;
  durationMinutes: number;
};

const DURATION_OPTIONS = [
  { label: '30m', minutes: 30 },
  { label: '1h', minutes: 60 },
  { label: '1h30', minutes: 90 },
  { label: '2h', minutes: 120 },
  { label: '3h', minutes: 180 },
  { label: '4h', minutes: 240 },
  { label: 'All day', minutes: 480 },
];

export const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;

/** Rounds up to the next quarter hour — a sensible default start time. */
export const defaultSchedule = (): EventSchedule => {
  const now = new Date();
  now.setMinutes(now.getMinutes() + MINUTE_STEP, 0, 0);
  now.setMinutes(Math.ceil(now.getMinutes() / MINUTE_STEP) * MINUTE_STEP, 0, 0);

  return {
    date: toDateKey(now),
    time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    durationMinutes: 120,
  };
};

export default function EventScheduleField({
  value,
  onChange,
}: {
  value: EventSchedule;
  onChange: (next: EventSchedule) => void;
}) {
  const timeScrollRef = useRef<ScrollView>(null);
  // The default start time is the next quarter hour, which sits far down a
  // 96-slot list. Without scrolling to it the picker opens on 12:00 AM and the
  // user has to hunt for the time that is already selected.
  const hasScrolledToSelection = useRef(false);

  /**
   * Scrolls the selected chip into view as soon as it reports its position.
   * Chip widths vary with the locale's time format, so the offset has to come
   * from layout rather than being calculated from a fixed width.
   */
  const onTimeChipLayout = (slot: string, x: number) => {
    if (hasScrolledToSelection.current || slot !== value.time) return;
    hasScrolledToSelection.current = true;
    timeScrollRef.current?.scrollTo({ x: Math.max(x - 24, 0), animated: false });
  };

  const days = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return Array.from({ length: DAYS_AHEAD }, (_, offset) => {
      const date = new Date(today);
      date.setDate(today.getDate() + offset);
      return {
        key: toDateKey(date),
        weekday: date.toLocaleDateString(undefined, { weekday: 'short' }),
        dayNumber: date.getDate(),
        month: date.toLocaleDateString(undefined, { month: 'short' }),
        label: offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : null,
      };
    });
  }, []);

  const times = useMemo(() => {
    const slots: string[] = [];
    for (let hour = 0; hour < 24; hour += 1) {
      for (let minute = 0; minute < 60; minute += MINUTE_STEP) {
        slots.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
      }
    }
    return slots;
  }, []);

  const formatTimeLabel = (slot: string) => {
    const [hour, minute] = slot.split(':').map(Number);
    const date = new Date();
    date.setHours(hour, minute, 0, 0);
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  };

  const endLabel = useMemo(() => {
    const [hour, minute] = value.time.split(':').map(Number);
    if (Number.isNaN(hour)) return '';
    const end = new Date();
    end.setHours(hour, minute + value.durationMinutes, 0, 0);
    return end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }, [value.time, value.durationMinutes]);

  return (
    <View style={{ gap: 16 }}>
      <View>
        <Text style={styles.subLabel}>Date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {days.map((day) => {
            const selected = day.key === value.date;
            return (
              <Pressable
                key={day.key}
                onPress={() => onChange({ ...value, date: day.key })}
                style={[styles.dayChip, selected && styles.chipSelected]}
              >
                <Text style={[styles.dayWeekday, selected && styles.chipTextSelected]}>
                  {day.label || day.weekday}
                </Text>
                <Text style={[styles.dayNumber, selected && styles.chipTextSelected]}>
                  {day.dayNumber}
                </Text>
                <Text style={[styles.dayMonth, selected && styles.chipTextSelected]}>{day.month}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View>
        <Text style={styles.subLabel}>Start time</Text>
        <ScrollView
          ref={timeScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {times.map((slot) => {
            const selected = slot === value.time;
            return (
              <Pressable
                key={slot}
                onPress={() => onChange({ ...value, time: slot })}
                onLayout={(event) => onTimeChipLayout(slot, event.nativeEvent.layout.x)}
                style={[styles.timeChip, selected && styles.chipSelected]}
              >
                <Text style={[styles.timeText, selected && styles.chipTextSelected]}>
                  {formatTimeLabel(slot)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View>
        <Text style={styles.subLabel}>Duration</Text>
        <View style={styles.wrapRow}>
          {DURATION_OPTIONS.map((option) => {
            const selected = option.minutes === value.durationMinutes;
            return (
              <Pressable
                key={option.minutes}
                onPress={() => onChange({ ...value, durationMinutes: option.minutes })}
                style={[styles.durationChip, selected && styles.chipSelected]}
              >
                <Text style={[styles.timeText, selected && styles.chipTextSelected]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {!!endLabel && <Text style={styles.summary}>Ends around {endLabel}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  subLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  chipRow: { gap: 8, paddingRight: 8 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  dayChip: {
    width: 62,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  dayWeekday: { fontSize: 10, color: '#6b7280', fontWeight: '600' },
  dayNumber: { fontSize: 18, color: '#111827', fontWeight: '700', marginVertical: 1 },
  dayMonth: { fontSize: 10, color: '#6b7280' },

  timeChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  durationChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  timeText: { fontSize: 13, color: '#374151', fontWeight: '600' },

  chipSelected: { backgroundColor: '#111827', borderColor: '#111827' },
  chipTextSelected: { color: '#fff' },

  summary: { fontSize: 12, color: '#6b7280', marginTop: 8 },
});
