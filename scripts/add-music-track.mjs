#!/usr/bin/env node
/**
 * Adds a track to the shared music library.
 *
 * Uploads a local audio file to Firebase Storage and writes its catalogue
 * entry. Tracks are hosted in the project's own bucket rather than hotlinked:
 * free-music hosts generally forbid hotlinking, and a dead link would silence
 * the feed for every event using that track.
 *
 * Needs the same service account the Stripe webhook uses:
 *   export FIREBASE_SERVICE_ACCOUNT_B64=...
 *
 * Usage:
 *   node scripts/add-music-track.mjs \
 *     --file ./downloads/slow-morning.mp3 \
 *     --title "Slow Morning" \
 *     --artist "Kai Engel" \
 *     --mood Chill \
 *     --licence CC-BY \
 *     --attribution "Slow Morning by Kai Engel, CC-BY 4.0" \
 *     --source "https://freemusicarchive.org/..."
 *
 * Licences that need a credit (CC-BY, CC-BY-SA) are rejected without
 * --attribution, because a missing credit is a licence breach and the app
 * cannot invent one after the fact.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const VALID_LICENCES = ['CC0', 'CC-BY', 'CC-BY-SA', 'PUBLIC_DOMAIN', 'LICENSED'];
const NEEDS_CREDIT = ['CC-BY', 'CC-BY-SA'];
const VALID_MOODS = ['Upbeat', 'Chill', 'Warm', 'Energetic', 'Dreamy', 'Focused', 'Playful'];

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, token, index, all) => {
    if (token.startsWith('--')) pairs.push([token.slice(2), all[index + 1]]);
    return pairs;
  }, [])
);

const fail = (message) => {
  console.error(`\n  ${message}\n`);
  process.exit(1);
};

for (const required of ['file', 'title', 'artist', 'mood', 'licence']) {
  if (!args[required]) fail(`Missing --${required}. See the header of this file for usage.`);
}
if (!VALID_LICENCES.includes(args.licence)) {
  fail(`--licence must be one of: ${VALID_LICENCES.join(', ')}`);
}
if (!VALID_MOODS.includes(args.mood)) {
  fail(`--mood must be one of: ${VALID_MOODS.join(', ')}`);
}
if (NEEDS_CREDIT.includes(args.licence) && !args.attribution) {
  fail(`${args.licence} requires --attribution. Shipping it without a credit breaches the licence.`);
}
if (!fs.existsSync(args.file)) fail(`No such file: ${args.file}`);

const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
if (!encoded) fail('Set FIREBASE_SERVICE_ACCOUNT_B64 (the same value Vercel uses).');

const serviceAccount = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id,
    storageBucket: `${serviceAccount.project_id}.firebasestorage.app`,
  });
}

const id = args.id || crypto.randomUUID();
const extension = path.extname(args.file) || '.mp3';
const objectPath = `library/music/${id}${extension}`;

console.log(`\n  Uploading ${path.basename(args.file)} …`);

const bucket = getStorage().bucket();
// A download token makes the file readable by URL without widening the
// Storage rules for the whole bucket.
const downloadToken = crypto.randomUUID();
await bucket.upload(args.file, {
  destination: objectPath,
  metadata: {
    contentType: extension === '.wav' ? 'audio/wav' : 'audio/mpeg',
    cacheControl: 'public,max-age=31536000',
    metadata: { firebaseStorageDownloadTokens: downloadToken },
  },
});

const uri =
  `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/` +
  `${encodeURIComponent(objectPath)}?alt=media&token=${downloadToken}`;

const track = {
  id,
  title: args.title,
  artist: args.artist,
  uri,
  mood: args.mood,
  genre: args.genre || null,
  licence: args.licence,
  attribution: args.attribution || null,
  sourceUrl: args.source || null,
  durationSeconds: args.duration ? Number(args.duration) : null,
  addedAt: new Date(),
};

await getFirestore().collection('musicTracks').doc(id).set(track, { merge: true });

console.log(`  Added "${track.title}" by ${track.artist} (${track.licence})`);
if (track.attribution) console.log(`  Credit shown in-app: ${track.attribution}`);
console.log(`  Catalogue id: ${id}\n`);
