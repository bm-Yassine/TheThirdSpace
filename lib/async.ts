/**
 * The Firestore SDK retries a failed read indefinitely rather than rejecting.
 * That is the right default for a flaky connection, but it means a project-level
 * outage leaves every screen on a spinner forever with no way out. Racing reads
 * against a timeout converts that into an error the UI can actually show.
 */

export class TimeoutError extends Error {
  constructor(message = 'The request took too long') {
    super(message);
    this.name = 'TimeoutError';
  }
}

export const DEFAULT_READ_TIMEOUT_MS = 12 * 1000;

export const withTimeout = <T>(
  promise: Promise<T>,
  ms: number = DEFAULT_READ_TIMEOUT_MS
): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError()), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });

/** Runs a read with a timeout, returning `fallback` instead of throwing. */
export const withTimeoutOr = async <T>(
  promise: Promise<T>,
  fallback: T,
  ms: number = DEFAULT_READ_TIMEOUT_MS
): Promise<T> => {
  try {
    return await withTimeout(promise, ms);
  } catch {
    return fallback;
  }
};
