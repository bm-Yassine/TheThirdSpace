/**
 * Cross-platform alerts.
 *
 * React Native Web ships `Alert` as `static alert() {}` — an empty function.
 * Every `Alert.alert` call in the app was therefore a silent no-op in the
 * browser, which is where most people use this app. Validation failures
 * explained nothing, and worse, the success paths that put their navigation
 * inside a button's `onPress` never ran: creating an event wrote the event to
 * Firestore and then left the organizer sitting on the form with no feedback,
 * looking like nothing had happened.
 *
 * This module is the queue and the public API; `components/AlertHost` renders
 * it. The two are kept apart so this half stays free of React Native imports
 * and can be unit tested.
 *
 * The signature deliberately mirrors `Alert.alert(title, message, buttons)` so
 * call sites read the same on both platforms.
 */

export type AlertButtonStyle = 'default' | 'cancel' | 'destructive';

export type AlertButton = {
  text: string;
  onPress?: () => void;
  style?: AlertButtonStyle;
};

export type AlertRequest = {
  id: number;
  title: string;
  message?: string;
  buttons: AlertButton[];
};

type Listener = (queue: AlertRequest[]) => void;

const DEFAULT_BUTTONS: AlertButton[] = [{ text: 'OK' }];

let queue: AlertRequest[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

const emit = () => {
  for (const listener of listeners) {
    listener(queue);
  }
};

/**
 * Show an alert. Safe to call from anywhere — event handlers, catch blocks,
 * plain modules — because the queue lives outside React.
 */
export const showAlert = (title: string, message?: string, buttons?: AlertButton[]): number => {
  const id = nextId++;
  queue = [
    ...queue,
    {
      id,
      title,
      message,
      // An alert with no way to dismiss it would trap the user.
      buttons: buttons && buttons.length > 0 ? buttons : DEFAULT_BUTTONS,
    },
  ];
  emit();
  return id;
};

/**
 * Dismiss one alert and run that button's handler, if any.
 *
 * The handler runs after the alert leaves the queue, so a handler that opens
 * another alert — "Deleted" following "Delete this?" — queues behind rather
 * than fighting the one being dismissed.
 */
export const resolveAlert = (id: number, button?: AlertButton) => {
  const before = queue.length;
  queue = queue.filter((request) => request.id !== id);
  if (queue.length === before) {
    // Already resolved. Double-taps on a button must not fire twice.
    return;
  }
  emit();
  button?.onPress?.();
};

export const subscribeToAlerts = (listener: Listener): (() => void) => {
  listeners.add(listener);
  listener(queue);
  return () => {
    listeners.delete(listener);
  };
};

/** The alert currently on screen, if any. */
export const currentAlert = (): AlertRequest | undefined => queue[0];

/**
 * Which button a backdrop tap or an Android back press should act as: the
 * explicit cancel, or a lone button, but never a destructive one.
 */
export const dismissButtonFor = (request: AlertRequest): AlertButton | undefined => {
  const cancel = request.buttons.find((button) => button.style === 'cancel');
  if (cancel) {
    return cancel;
  }
  if (request.buttons.length === 1 && request.buttons[0].style !== 'destructive') {
    return request.buttons[0];
  }
  return undefined;
};

/** Test seam. */
export const __resetAlerts = () => {
  queue = [];
  nextId = 1;
  listeners.clear();
};
