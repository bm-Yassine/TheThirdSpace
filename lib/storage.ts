import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { auth, storage } from '../Backend/firebase';
import type { EventMedia } from './types';

/**
 * Firebase Storage uploads.
 *
 * Before this existed, the media picker put the *local device URI* straight
 * onto the event (`file:///…` on native, a `blob:` URL on web). Those resolve
 * only on the device that picked them, so every other user saw a broken image,
 * and on web the blob died on reload. Media has to be uploaded and referenced
 * by its download URL.
 */

export type UploadProgress = { completed: number; total: number; percent: number };

const extensionFor = (uri: string, type: 'image' | 'video') => {
  const match = /\.([a-zA-Z0-9]{3,4})(?:\?|$)/.exec(uri);
  if (match) return match[1].toLowerCase();
  return type === 'video' ? 'mp4' : 'jpg';
};

/** True for a URI that is already hosted and needs no upload. */
export const isRemoteUri = (uri: string) => /^https?:\/\//i.test(uri);

/**
 * Reads a local URI into a Blob.
 * `fetch` handles file://, content:// and blob: consistently across platforms,
 * which avoids needing a separate native file-system read path.
 */
const toBlob = async (uri: string): Promise<Blob> => {
  const response = await fetch(uri);
  if (!response.ok) throw new Error('Could not read the selected file');
  return response.blob();
};

/** Uploads one file and resolves to its public download URL. */
export const uploadFile = async (
  localUri: string,
  storagePath: string,
  onProgress?: (fraction: number) => void
): Promise<string> => {
  const blob = await toBlob(localUri);
  const task = uploadBytesResumable(ref(storage, storagePath), blob, {
    cacheControl: 'public,max-age=31536000',
  });

  await new Promise<void>((resolve, reject) => {
    task.on(
      'state_changed',
      (snapshot) =>
        onProgress?.(
          snapshot.totalBytes ? snapshot.bytesTransferred / snapshot.totalBytes : 0
        ),
      reject,
      () => resolve()
    );
  });

  return getDownloadURL(task.snapshot.ref);
};

/**
 * Uploads every local item in a media list, leaving already-hosted ones alone
 * so editing an event does not re-upload unchanged photos.
 */
export const uploadEventMedia = async (
  media: EventMedia[],
  onProgress?: (progress: UploadProgress) => void
): Promise<EventMedia[]> => {
  const user = auth.currentUser;
  if (!user) throw new Error('You need to be signed in to upload media');

  const pending = media.filter((item) => !isRemoteUri(item.uri));
  if (pending.length === 0) return media;

  let completed = 0;
  const report = () =>
    onProgress?.({
      completed,
      total: pending.length,
      percent: Math.round((completed / pending.length) * 100),
    });
  report();

  const uploaded: EventMedia[] = [];
  for (const item of media) {
    if (isRemoteUri(item.uri)) {
      uploaded.push(item);
      continue;
    }

    const path = `events/${user.uid}/${Date.now()}-${uploaded.length}.${extensionFor(
      item.uri,
      item.type
    )}`;
    const url = await uploadFile(item.uri, path);
    uploaded.push({ ...item, uri: url });

    completed += 1;
    report();
  }

  return uploaded;
};

/** Uploads a profile photo and returns its URL. */
export const uploadProfilePhoto = async (localUri: string): Promise<string> => {
  const user = auth.currentUser;
  if (!user) throw new Error('You need to be signed in');
  return uploadFile(localUri, `avatars/${user.uid}/${Date.now()}.jpg`);
};

/** Uploads an event soundtrack and returns its URL. */
export const uploadEventAudio = async (
  localUri: string,
  fileName: string
): Promise<string> => {
  const user = auth.currentUser;
  if (!user) throw new Error('You need to be signed in');
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-60);
  return uploadFile(localUri, `audio/${user.uid}/${Date.now()}-${safeName}`);
};
