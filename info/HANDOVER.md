# 📋 The Third Space — Project Handover Document

> **Date of Handover:** May 2026  
> **Project Status:** ~60% complete — Core MVP working, several key features pending production-readiness  
> **Live URL:** [https://thethirdspaceapp.com](https://thethirdspaceapp.com)  
> **Repository root:** `/TheThirdSpace/` (inside this Expo monorepo)

---


### 🔴 Must Hand Over In Person

- [ ] **Firebase account login** — add the new developer as a Firebase project member at https://console.firebase.google.com/project/thirdspace-8092b/settings/iam
- [ ] **Vercel account access** — invite the new developer via Vercel Dashboard → Settings → Members
- [ ] **Google Cloud Console access** — The new dev needs this to create OAuth Client IDs for iOS/Android.

### 🟡 Placeholder Values That Still Need Real Values

These are **fake/incomplete** in the current codebase and must be replaced:

| Item | Current State | What's Needed |
|---|---|---|
| iOS OAuth Client ID | `258758943296-abcdefghijklmnop.apps.googleusercontent.com` ← **FAKE** | Create real one in Google Cloud Console |
| Android OAuth Client ID | `258758943296-abcdefghijklmnop.apps.googleusercontent.com` ← **FAKE** | Create real one in Google Cloud Console |
| iOS Bundle Identifier | Not set in `app.json` | Decide and add e.g. `com.thethirdspace.app` |
| Android Package Name | Not set in `app.json` | Decide and add e.g. `com.thethirdspace.app` |
| Stripe Keys | Not created | Create Stripe account, get publishable + secret keys |
| Google Maps API Key | Not created | Enable Maps API in Google Cloud Console |
| `thethirdspaceapp.com` in Firebase | Unconfirmed | Verify it's in Firebase → Auth → Authorized domains |

### 🟢 Things Already Done — No Action Needed

- ✅ Firebase project created and configured (`thirdspace-8092b`)
- ✅ Firestore database active with real data
- ✅ Web OAuth Client ID exists: `258758943296-p4o6gvj7l0f178o8tcf7549qkkiggif1.apps.googleusercontent.com`
- ✅ Vercel project deployed and live at https://thethirdspaceapp.com
- ✅ All Firebase config values documented in `SERVICES_AND_KEYS.md`
- ✅ `vercel.json` build config is correct

---


## 🏛️ What Is This App?

**The Third Space** is a social event-discovery platform — a mobile-first web app where users can:
- **Discover** local events/activities created by other users (parties, sports, arts, food nights, etc.)
- **Join** events, pay for ticketed ones, or request approval from organizers
- **Create** their own events with photos, music, tags, and capacity settings
- **Favorite** events they're interested in
- **Chat** with other users / organizers directly
- **Manage** their profile, bio, interests, events joined, and events created

The app runs on **iOS, Android, and Web** via Expo, and is deployed as a static web app on **Vercel** with a custom domain.

---

## 🗂️ Project Structure

```
/Users/yb/Dev/Coding/Expo/
├── HANDOVER.md                  ← You are here
├── SERVICES_AND_KEYS.md         ← All credentials & service access
├── DEVELOPER_GUIDE.md           ← Setup & development instructions
├── GOOGLE_OAUTH_SETUP.md        ← OAuth configuration guide
├── project_goals.txt            ← Original goals and TODO list
└── TheThirdSpace/               ← Main application folder
    ├── app.json                 ← Expo app config (scheme, icons, etc.)
    ├── vercel.json              ← Vercel deployment config
    ├── package.json             ← Dependencies
    ├── tsconfig.json            ← TypeScript config
    ├── tailwind.config.js       ← Tailwind/NativeWind config
    ├── app/                     ← All screens (Expo Router file-based)
    │   ├── _layout.tsx          ← Root layout, auth state listener
    │   ├── index.tsx            ← Entry redirect → /home
    │   ├── login.tsx            ← Login / Signup screen
    │   ├── home.tsx             ← Home shell (switches view modes)
    │   ├── home/
    │   │   ├── DiscoverView.tsx ← Full-screen swipeable discover feed
    │   │   ├── CardsView.tsx    ← Grid/card layout of events
    │   │   └── MapView.tsx      ← Map view (placeholder/basic)
    │   ├── create.tsx           ← Event creation form
    │   ├── activity_detail.tsx  ← Event detail / join / pay screen
    │   ├── favorites.tsx        ← Saved/favorited events
    │   ├── chats.tsx            ← Conversations list + messaging
    │   ├── profile.tsx          ← User profile, stats, edit
    │   ├── organizer_info.tsx   ← Organizer public profile
    │   ├── payment.tsx          ← Simulated payment screen (Stripe pending)
    │   ├── post_event_rating.tsx← Post-event rating (stub)
    │   └── modal.tsx            ← Generic modal screen
    ├── Backend/
    │   └── firebase.ts          ← ALL Firebase logic: auth + Firestore + types
    ├── lib/
    │   ├── types.tsx            ← TypeScript types (Event, Organizer, etc.)
    │   ├── events.tsx           ← Mock/seed events for development
    │   └── eventFeed.ts         ← Event feed cache + merge logic
    ├── components/
    │   └── FloatingNavigation.tsx ← Animated floating bottom nav bar
    ├── constants/
    │   └── theme.ts             ← App colors and theme constants
    └── assets/                  ← Images, icons, logo
```

---

## 🏗️ Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        USER INTERFACES                            │
│   iOS App  │  Android App  │  Web Browser (thethirdspaceapp.com) │
└──────────────────────┬───────────────────────────────────────────┘
                       │  Expo Router (file-based navigation)
┌──────────────────────▼───────────────────────────────────────────┐
│                       REACT NATIVE / EXPO                         │
│  Screens: Home · Discover · Cards · Map · Create · Detail        │
│           Favorites · Chats · Profile · Payment · Organizer       │
│  Components: FloatingNavigation (animated, auth-aware)            │
└──────────────────────┬───────────────────────────────────────────┘
                       │  Backend/firebase.ts
┌──────────────────────▼───────────────────────────────────────────┐
│                        FIREBASE (Google Cloud)                    │
│  ┌────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  Auth          │  │  Firestore DB     │  │  Storage         │  │
│  │  Email/Pass    │  │  events/          │  │  (configured,    │  │
│  │  Google OAuth  │  │  users/{uid}/     │  │   not yet used   │  │
│  │  (coming soon) │  │  conversations/   │  │   for uploads)   │  │
│  └────────────────┘  │  payments/        │  └──────────────────┘  │
│                       └──────────────────┘                        │
└──────────────────────────────────────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────────────┐
│                     VERCEL (Static Hosting)                       │
│  Build: npx expo export --platform web  →  dist/                 │
│  Domain: thethirdspaceapp.com                                     │
│  Rewrites: all routes → /index.html (SPA mode)                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🗃️ Firestore Data Schema

```
Firestore Root
│
├── events/                          ← All user-created events
│   └── {eventId}
│       ├── id: string
│       ├── title: string
│       ├── description: string
│       ├── type: string             (Sports, Music, Food, etc.)
│       ├── imageUrl: string
│       ├── time: string
│       ├── date: string
│       ├── timeFlexible: boolean
│       ├── location: string
│       ├── latitude?: number
│       ├── longitude?: number
│       ├── attendees: number        (current count)
│       ├── minAttendees?: number
│       ├── maxAttendees?: number
│       ├── tags: string[]
│       ├── cost: number             (0 = free)
│       ├── requiresApproval: boolean
│       ├── music?: { title, artist, startAtSeconds }
│       ├── media?: [{ uri, type, width, height }]
│       ├── attendeesList: [{ uid, name, photoURL, joinedAt, status }]
│       ├── organizer: { uid, name, avatar, photoURL }
│       ├── createdBy: string        (Firebase Auth UID)
│       ├── createdAt: Timestamp
│       └── updatedAt: Timestamp
│
├── users/                           ← User profiles
│   └── {uid}
│       ├── uid: string
│       ├── email: string
│       ├── displayName: string
│       ├── photoURL?: string
│       ├── bio?: string
│       ├── interests?: string[]
│       ├── createdAt: Timestamp
│       ├── updatedAt: Timestamp
│       ├── stats: { eventsJoined, eventsCreated, rating }
│       │
│       ├── favorites/               ← Sub-collection
│       │   └── {eventId}: { eventId, addedAt }
│       │
│       ├── commitments/             ← Sub-collection (joined/requested events)
│       │   └── {eventId}: { eventId, status, reason, paymentStatus, committedAt }
│       │
│       ├── joinedEvents/            ← Sub-collection (mirror of commitments)
│       │   └── {eventId}: { same as commitments }
│       │
│       └── createdEvents/           ← Sub-collection (index of events user created)
│           └── {eventId}: { eventId, createdAt, updatedAt }
│
├── conversations/                   ← Direct messages between users
│   └── {conversationId}
│       ├── id: string
│       ├── participantIds: string[]
│       ├── participantProfiles: { [uid]: { displayName, photoURL } }
│       ├── lastMessage: string
│       ├── lastMessageSenderId: string
│       ├── createdAt: Timestamp
│       ├── updatedAt: Timestamp
│       └── messages/                ← Sub-collection
│           └── {messageId}: { senderId, text, createdAt }
│
└── payments/                        ← Payment records (simulated for now)
    └── {paymentId}
        ├── id: string
        ├── eventId: string
        ├── payerUid: string
        ├── amount: number
        ├── method: 'stripe' | 'card' | 'paypal'
        ├── status: 'pending' | 'completed'
        ├── createdAt: Timestamp
        └── updatedAt: Timestamp
```

---

## 📊 Feature Progress Chart

```
FEATURE                          STATUS          NOTES
─────────────────────────────────────────────────────────────────────
Authentication
  Email/Password Login         ✅ DONE          Fully working
  Email/Password Signup        ✅ DONE          Creates Firestore profile
  Forgot Password (email)      ✅ DONE
  Google OAuth (web)           ⚠️  PENDING      Placeholder - needs real OAuth IDs
  Google OAuth (mobile)        ⚠️  PENDING      Needs ios/android client IDs
  Auth guards (nav)            ✅ DONE          Non-home tabs require login
  Persist session              ✅ DONE          AsyncStorage on mobile, IndexedDB on web

User Profiles
  Profile creation             ✅ DONE          Auto-created on signup
  View own profile             ✅ DONE
  Edit name/bio/interests      ✅ DONE
  Profile photo / avatar       ⚠️  PARTIAL      Emoji placeholder; no image upload
  View organizer profile       ✅ DONE          organizer_info.tsx screen

Event Discovery (Home)
  Discover view (fullscreen)   ✅ DONE          Swipeable, animated
  Cards view (grid)            ✅ DONE
  Map view                     ⚠️  PARTIAL      UI shell exists, no real map pins
  Merge Firebase + mock events ✅ DONE          eventFeed.ts cache + fallback
  Event feed caching           ✅ DONE          2-min TTL cache

Event Creation
  Full creation form           ✅ DONE
  Music metadata               ✅ DONE
  Media pick from device       ✅ DONE          Uses expo-image-picker
  Media upload to storage      ❌ NOT DONE      Local URIs only, no cloud upload
  Auth required to create      ✅ DONE
  Saves to Firestore           ✅ DONE
  Appears in feed immediately  ✅ DONE          Via upsertCachedEvent

Event Detail & Joining
  View event detail            ✅ DONE
  Favorite / unfavorite        ✅ DONE          Persists to Firestore
  Join free event              ✅ DONE          Direct / waitlist / approval flows
  Cancel commitment            ✅ DONE
  Status banners               ✅ DONE          Pending/approved/waitlist UI

Payment Flow
  Payment screen UI            ✅ DONE
  Simulated card payment       ✅ DONE          Fake 1s delay, writes to Firestore
  Real Stripe integration      ❌ NOT DONE      Needs Stripe SDK + backend webhook
  PayPal integration           ❌ NOT DONE

Favorites Screen
  View saved events            ✅ DONE
  Remove from favorites        ✅ DONE

Messaging / Chats
  Conversation list            ✅ DONE
  Open DM from organizer page  ✅ DONE
  Send/receive messages        ✅ DONE          Via Firestore sub-collection
  Real-time updates            ⚠️  PARTIAL      Manual refresh (no Firestore listener)
  Push notifications           ❌ NOT DONE

Profile Screen
  Overview tab                 ✅ DONE
  Created events tab           ✅ DONE
  Joined events tab            ✅ DONE
  Stats (joined/created/rating)✅ DONE
  Logout                       ✅ DONE

Deployment
  Vercel config                ✅ DONE
  Custom domain                ✅ DONE          thethirdspaceapp.com
  Firebase authorized domain   ⚠️  CHECK        Verify domain added in Firebase Console

Security
  Firestore security rules     ❌ NOT DONE      Currently open/dev rules
  Firestore indexes            ⚠️  PARTIAL      May hit index errors on complex queries

Visual / UX Polish
  Floating animated nav        ✅ DONE          Gentle up/down float animation
  Light/dark nav tone          ✅ DONE
  Discover view animations     ⚠️  PARTIAL      Basic, needs more polish
  Map pins per city            ❌ NOT DONE
  Background blur / edge-edge  ❌ NOT DONE
  Music library integration    ❌ NOT DONE

AI / Smart Features
  n8n event recommendation     ❌ NOT DONE      Future: mood/weather/interest model
  Event ordering by relevance  ❌ NOT DONE
```

---

## 🔄 Data Flow: Key User Journeys

### 1. New User Signup
```
User fills form (name, email, password)
  → authService.signUp()
    → Firebase Auth creates account
    → dataService.createUserProfile()
      → Firestore: users/{uid} document created
  → dataService.ensureUserProfileFromAuthUser()
  → router.replace('/home')
```

### 2. Create an Event
```
User on /create (must be logged in)
  → Fills form: title, type, time, location, tags, cost, media, music
  → handleSubmit()
    → dataService.createEvent(eventData)
      → Firestore: events/{newId} document created
      → Firestore: users/{uid}/createdEvents/{eventId} reference created
      → User stats.eventsCreated incremented
    → upsertCachedEvent() → Appears immediately in feed
  → router.replace('/home')
```

### 3. Join a Paid Event
```
User on /activity_detail
  → Taps "Join Activity - $25"
    → router.push('/payment', { eventId, amount, title })
  → Payment screen: fills card details
    → handlePay()
      → [1s simulated delay - NO REAL STRIPE]
      → dataService.recordPayment() → Firestore payments/{id}
      → dataService.commitToEvent({ paymentCompleted: true })
        → users/{uid}/commitments/{eventId}
        → users/{uid}/joinedEvents/{eventId}
        → events/{eventId}.attendees += 1
        → events/{eventId}.attendeesList.push(user)
  → router.replace('/activity_detail')
```

### 4. Send a Message
```
From /organizer_info or /activity_detail
  → Tap "Message"
    → router.push('/chats', { otherUserId })
  → ChatsScreen:
    → dataService.getOrCreateConversation(otherUserId)
      → Checks existing conversations in Firestore
      → Creates conversations/{id} if not found
    → User types message → onSend()
      → dataService.sendMessage(conversationId, text)
        → Firestore: conversations/{id}/messages/{msgId}
        → Updates lastMessage on conversation
```

---

## 🎨 Tech Stack Summary

| Layer | Technology |
|---|---|
| Framework | Expo SDK 54 (React Native 0.81.5) |
| Navigation | Expo Router v6 (file-based) |
| Language | TypeScript |
| Styling | StyleSheet + NativeWind (Tailwind) |
| Icons | Lucide React Native + react-native-svg |
| Backend/DB | Firebase (Firestore + Auth + Storage) |
| Maps | react-native-maps (installed, partial) |
| Media | expo-image-picker |
| Animations | React Native Animated API |
| Web Hosting | Vercel (static export) |
| Domain | thethirdspaceapp.com (via Vercel) |
| Payments | Simulated only (Stripe integration pending) |

---

## 🚦 Priority Order for Next Developer

### 🔴 Must Do Before Going Live

1. **Firestore Security Rules** — Currently wide open. Add proper rules so only authenticated users can write, and only creators can edit/delete their events.

2. **Real Stripe Integration** — The payment screen is a fake. Replace the `setTimeout` in `payment.tsx` with a real Stripe Checkout session and webhook confirmation. Stripe funds should be transferable between users (for paid event tickets).

3. **Real Google OAuth** — Currently disabled with "Coming Soon". Get real OAuth Client IDs from Google Cloud Console (see `GOOGLE_OAUTH_SETUP.md` and `SERVICES_AND_KEYS.md`).

4. **Firebase Authorized Domains** — Verify `thethirdspaceapp.com` is in Firebase Console → Authentication → Settings → Authorized domains.

### 🟡 High Priority Features

5. **Profile Photo Upload** — Wire up Firebase Storage to allow users to upload a profile picture (currently just 👤 emoji).

6. **Real-time Chat Updates** — Replace manual polling in `chats.tsx` with `onSnapshot()` Firestore listeners for live messaging.

7. **Map View with Pins** — Complete the MapView screen with actual `react-native-maps` markers at event coordinates.

8. **Event Loading Speed** — The feed takes time to load. Consider: preloading on app start, skeleton screens, or reducing initial fetch size.

### 🟢 Nice to Have / Future Features

9. **n8n AI Recommendations** — Event ordering by user profile, interests, weather, mood. Integrate n8n workflow engine.

10. **Copyright-free Music Library** — Allow event creators to pick background music from a curated library.

11. **Post-event Rating** — `post_event_rating.tsx` screen stub exists but is not wired up.

12. **DiscoverView Polish** — Edge-to-edge background, blur effects, better animations.

---

## 📁 Key Files to Understand First

| File | Why It Matters |
|---|---|
| `Backend/firebase.ts` | The entire backend interface — auth, Firestore CRUD, all data functions |
| `lib/types.tsx` | Core TypeScript types — `Event`, `Organizer`, `EventMusic`, `EventMedia` |
| `lib/eventFeed.ts` | Event feed caching and merging Firebase + mock events |
| `app/_layout.tsx` | Root layout, app startup, auth state management |
| `app/home.tsx` + `home/DiscoverView.tsx` | Main discovery experience |
| `app/create.tsx` | Full event creation flow |
| `components/FloatingNavigation.tsx` | Shared animated nav bar used across all screens |

---

## 🔑 Accounts & Services Summary

> See `SERVICES_AND_KEYS.md` for all credentials and access details.

| Service | Purpose | Access |
|---|---|---|
| Firebase Project `thirdspace-8092b` | Auth + Firestore + Storage | Google account linked to project |
| Vercel | Web hosting + domain | Vercel account (same Google/email) |
| `thethirdspaceapp.com` | Custom domain | Configured in Vercel |
| Google Cloud Console | OAuth client IDs | Same project as Firebase |
| Stripe | Payments (not yet live) | Needs account setup |
