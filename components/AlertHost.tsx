import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  AlertButton,
  AlertRequest,
  dismissButtonFor,
  resolveAlert,
  subscribeToAlerts,
} from '../lib/alert';
import { Palette, Radius, Space, Status, TouchTarget } from '../constants/design';

/**
 * Renders the alert queue from `lib/alert`.
 *
 * One implementation for both platforms rather than deferring to the native
 * `Alert`: React Native Web's version does nothing at all (see lib/alert), and
 * a single rendered dialog also means the same wording, spacing and colours
 * everywhere instead of an OS dialog on one platform and ours on the other.
 *
 * Mounted once, at the root.
 */
export default function AlertHost() {
  const [queue, setQueue] = useState<AlertRequest[]>([]);

  useEffect(() => subscribeToAlerts(setQueue), []);

  const request = queue[0];
  if (!request) {
    return null;
  }

  const dismiss = dismissButtonFor(request);
  // Two buttons sit side by side the way a question reads; one, or three or
  // more, stack so each stays a full-width target.
  const sideBySide = request.buttons.length === 2;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      // Android back, and Escape on web.
      onRequestClose={() => dismiss && resolveAlert(request.id, dismiss)}
    >
      <Pressable
        style={styles.backdrop}
        onPress={() => dismiss && resolveAlert(request.id, dismiss)}
      >
        {/* Swallows taps so pressing the dialog itself does not dismiss it. */}
        <Pressable style={styles.dialog} onPress={() => {}}>
          <Text style={styles.title}>{request.title}</Text>
          {!!request.message && <Text style={styles.message}>{request.message}</Text>}

          <View style={[styles.actions, sideBySide && styles.actionsRow]}>
            {request.buttons.map((button, index) => (
              <AlertAction
                key={`${button.text}-${index}`}
                button={button}
                grow={sideBySide}
                onPress={() => resolveAlert(request.id, button)}
              />
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function AlertAction({
  button,
  grow,
  onPress,
}: {
  button: AlertButton;
  grow: boolean;
  onPress: () => void;
}) {
  const quiet = button.style === 'cancel';
  const destructive = button.style === 'destructive';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={button.text}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        grow && styles.actionGrow,
        quiet && styles.actionQuiet,
        destructive && styles.actionDestructive,
        pressed && styles.actionPressed,
      ]}
    >
      <Text
        style={[
          styles.actionText,
          quiet && styles.actionTextQuiet,
          destructive && styles.actionTextDestructive,
        ]}
      >
        {button.text}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Space.xl,
  },
  dialog: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Palette.white,
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    gap: Space.sm,
  },
  title: { fontSize: 17, fontWeight: '700', color: Palette.ink },
  message: { fontSize: 14, lineHeight: 20, color: Palette.body },

  actions: { gap: Space.sm, marginTop: Space.md },
  actionsRow: { flexDirection: 'row' },

  action: {
    minHeight: TouchTarget.comfortable,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Space.lg,
    borderRadius: Radius.control,
    backgroundColor: Palette.ink,
  },
  actionGrow: { flex: 1 },
  actionQuiet: { backgroundColor: Palette.surface },
  actionDestructive: { backgroundColor: Status.declined.fill },
  actionPressed: { opacity: 0.85 },

  actionText: { fontSize: 15, fontWeight: '600', color: Palette.white },
  actionTextQuiet: { color: Palette.mutedStrong },
  actionTextDestructive: { color: Status.declined.ink },
});
