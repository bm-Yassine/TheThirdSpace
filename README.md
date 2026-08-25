# The Third Space

**Find what's happening around you.** A mobile-first event discovery app — scroll a full-screen feed of local events, join them, pay for them, chat with organizers, and rate each other afterwards.

🔗 **Live:** [thethirdspaceapp.com](https://thethirdspaceapp.com) · 🎨 **Design:** Figma → shipped app, all in-house

> The name comes from the sociological idea of a *third place* — the spaces beyond home (first) and work (second) where community actually happens.

---

## What it does

| | |
|---|---|
| **Discover** | Full-screen swipeable feed, upcoming events only, soonest first. Also a grid view and a map view with real pins. |
| **Create** | Events with a real date/time/duration, capacity, price, tags, music and media. |
| **Join** | Four lanes handled properly: instant join, request-and-approve, pay-to-join, and a waitlist that promotes automatically. |
| **Pay** | Stripe Checkout, with the price read server-side so it can't be tampered with. |
| **Organize** | Approve or decline requests, work the waitlist, message attendees. |
| **Chat** | Realtime 1:1 messaging with organizers and attendees. |
| **Rate** | After an event ends, attendees rate the organizer and organizers rate attendees. Reputation is aggregated from real ratings. |
| **Profile** | Interests and bio, plus what you're hosting, what's coming up, and what you've attended. |

---

## Tech

| Layer | Choice |
|---|---|
| Framework | Expo SDK 54 · React Native 0.81 · one codebase for web, iOS, Android |
| Routing | Expo Router v6 (file-based) |
| Language | TypeScript |
| Data | Firebase — Auth, Firestore, Storage |
| Payments | Stripe Checkout via Vercel serverless functions |
| Hosting | Vercel static export + `/api` functions |
| Maps | Custom OpenStreetMap tile renderer (no API key, works on web *and* native) |

---

## Architecture notes

A few decisions worth calling out, because they're the ones that took thought.

**Participation is transactional.** Attendees live in `events/{id}/participants/{uid}`, not in an array on the event document. Joining, approving, leaving and waitlist promotion all run inside a Firestore transaction that moves the denormalised counters (`attendees`, `pendingCount`, `waitlistCount`) atomically. An array with read-modify-write can exceed capacity when two people join at the same moment; this can't.

**The state machine is separate from the database.** `lib/participation.ts` holds the join/promote/counter decisions as pure functions with no Firebase import, so they're testable without a live database. `Backend/firebase.ts` applies them inside transactions. Tests include a property check that counters return to zero across every transition and its reverse.

**Auth is resolved before it's read.** Firebase restores a web session asynchronously from IndexedDB, so a synchronous `getCurrentUser()` on mount returns `null` for a signed-in user. `lib/auth.tsx` exposes an `initializing` flag; no screen treats "no user" as signed-out until Firebase has actually decided.

**Reputation is computed on read.** Denormalising it onto the user document would mean the *rater* writing to the *ratee's* profile, which needs a security rule loose enough to let anyone forge someone else's reputation. A single indexed query is cheaper than that trade.

**Scheduling degrades gracefully.** Events carry `startsAt`/`endsAt`/`durationMinutes`. Documents created before that existed only had free-text `date`/`time`, so `lib/eventTime.ts` reads the new fields first and parses the old strings as a fallback — old events still sort and render.

**The map has no API key.** `react-native-maps` has no web implementation and the Google Maps JS API needs a billed key. Raster tiles are just images, so a small Web Mercator projection plus `<Image>` gives one map that renders identically on web, iOS and Android.

---

## Running it

```bash
npm install
cp .env.example .env.local
npx expo start
```

Press `w` for web, `i` for iOS, `a` for Android.

With no Firebase data available, set `EXPO_PUBLIC_USE_MOCK_EVENTS=true` in `.env.local` to seed the feed from `lib/events.tsx`. Mock events are **never** merged into the feed in production.

```bash
npm test        # pure-logic tests (scheduling, participation state machine)
npm run typecheck
npm run lint
```

---

## Configuration

All client config lives in `.env.local` — see [`.env.example`](.env.example). Everything prefixed `EXPO_PUBLIC_` is bundled into the client, so only publishable values go there.

Server-side secrets are Vercel environment variables with **no** `EXPO_PUBLIC_` prefix:

| Variable | Purpose |
|---|---|
| `STRIPE_SECRET_KEY` | Creating Checkout Sessions |
| `STRIPE_WEBHOOK_SECRET` | Verifying webhook signatures |
| `FIREBASE_SERVICE_ACCOUNT_B64` | Base64-encoded service account JSON for the Admin SDK |

### Firestore

Rules and indexes are version-controlled:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

Rules enforce that a user writes only their own documents, that only an event's organizer manages its attendees, that participation counters are the sole fields a joiner may touch on an event, and that messages are immutable once sent.

---

## Project structure

```
app/                      Screens (Expo Router file-based routing)
  _layout.tsx             Root layout, providers, feed warm-up
  home.tsx                Shell switching Discover / Cards / Map
  create.tsx              Event creation
  activity_detail.tsx     Event detail, join / pay / favourite / rate
  manage_event.tsx        Organizer: approvals, waitlist, attendees
  post_event_rating.tsx   Post-event rating flow
  profile.tsx             Overview, hosting, upcoming, history
  chats.tsx               Realtime messaging
components/
  home/                   Discover, Cards and Map views
  TileMap.tsx             OpenStreetMap renderer
  EventScheduleField.tsx  Cross-platform date/time/duration picker
lib/
  auth.tsx                Auth provider
  eventTime.ts            Scheduling helpers
  participation.ts        Join / promote / counter state machine (pure)
  payments.ts             Stripe Checkout client
  eventFeed.ts            Feed cache
  __tests__/              Unit tests
Backend/firebase.ts       Firebase init + all Firestore access
api/                      Vercel serverless functions (Stripe)
firestore.rules           Security rules
```

---

## Status

Implemented end-to-end: auth, profiles, event creation, discovery, favourites, the full join/approve/waitlist/pay flow, organizer management, realtime chat, post-event ratings, attendance history, and the map.

Not done yet:
- Google OAuth (UI present, needs iOS/Android client IDs)
- Media upload to Firebase Storage (picker works, files aren't uploaded)
- Push notifications
- Copyright-free music library for event creation
- n8n recommendation engine

---

## Design

The interface was designed from scratch in Figma before any code was written — the discovery feed, the floating navigation, the event creation flow and the rating screens. See the [design case study](https://github.com/bm-Yassine/thethirdspace-design) for the process from wireframe to shipped product.
