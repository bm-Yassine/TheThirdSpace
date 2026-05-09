# 🌐 The Third Space

**A social event-discovery platform** — find, create, and join local activities with people around you.

> 🔗 **Live:** [https://thethirdspaceapp.com](https://thethirdspaceapp.com)  
> 📋 **Full handover docs:** see `../HANDOVER.md`, `../SERVICES_AND_KEYS.md`, `../DEVELOPER_GUIDE.md`

---

## 🎯 What Is It?

The Third Space is a mobile-first app (also accessible on web) where users can:

- **Discover** events and activities near them — parties, sports, arts, food nights, outdoor meetups
- **Join** events — free, paid (Stripe), or approval-based
- **Create** their own events with photos, music, tags, and capacity limits
- **Favorite** events they're interested in
- **Chat** directly with event organizers and other users
- **Manage** their profile, interests, events joined, and events created

The name "Third Space" refers to the sociological concept of places beyond home (first space) and work (second space) — the community spaces where social life happens.

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 54 / React Native 0.81.5 |
| Navigation | Expo Router v6 (file-based) |
| Language | TypeScript |
| Backend / Database | Firebase (Firestore + Auth + Storage) |
| Web Hosting | Vercel (static export) |
| Domain | thethirdspaceapp.com |
| Maps | react-native-maps (installed, partial) |
| Payments | Stripe (UI done, real integration pending) |
| AI/Recommendations | n8n (planned, not yet integrated) |

---

## ✅ Current Status (~60% complete)

### Working
- ✅ Email/password login, signup, forgot password
- ✅ User profile creation, editing (name, bio, interests)
- ✅ Event discovery: Discover view (full-screen) + Cards view (grid) + Map view (shell)
- ✅ Event creation with type, tags, music metadata, media picker, cost, capacity
- ✅ Join events: direct join / approval request / waitlist logic
- ✅ Favorite events (persisted to Firestore)
- ✅ Activity detail screen with commitment state banners
- ✅ Payment screen UI (simulated — no real Stripe yet)
- ✅ Direct messaging between users
- ✅ Organizer public profile
- ✅ Profile screen: overview, created events, joined events, stats
- ✅ Animated floating navigation bar (auth-aware)
- ✅ Deployed to Vercel with custom domain

### Pending / In Progress
- ⚠️ Google OAuth (UI ready, needs real OAuth Client IDs)
- ⚠️ Real Stripe payment processing (backend + SDK integration needed)
- ⚠️ Map view with real event pins (react-native-maps installed)
- ⚠️ Firestore security rules (currently open/dev mode)
- ⚠️ Profile photo upload (Firebase Storage configured, not wired up)
- ⚠️ Real-time chat (currently one-shot fetch, needs onSnapshot)
- ❌ n8n AI recommendation engine
- ❌ Push notifications
- ❌ Post-event rating (screen stub exists)
- ❌ Copyright-free music library for event creation

---

## 🚀 Quick Start (Development)

```bash
cd TheThirdSpace
npm install
npx expo start
```

Press `w` to open in browser, `i` for iOS simulator, `a` for Android.

See `../DEVELOPER_GUIDE.md` for full setup, environment variables, and task-by-task implementation guides.

---

## 📁 Project Structure

```
TheThirdSpace/
├── app/                    ← All screens (Expo Router file-based)
│   ├── _layout.tsx         ← Root layout + app startup (preloads event feed)
│   ├── index.tsx           ← Entry → redirects to /home
│   ├── login.tsx           ← Login / Signup
│   ├── home.tsx            ← Home shell (Discover / Cards / Map views)
│   ├── home/
│   │   ├── DiscoverView.tsx
│   │   ├── CardsView.tsx
│   │   └── MapView.tsx
│   ├── create.tsx          ← Event creation form
│   ├── activity_detail.tsx ← Event detail, join, favorite, pay
│   ├── favorites.tsx
│   ├── chats.tsx           ← Conversations + messaging
│   ├── profile.tsx         ← User profile + tabs
│   ├── organizer_info.tsx  ← Organizer public page
│   └── payment.tsx         ← Payment screen (simulated)
├── Backend/
│   └── firebase.ts         ← All Firebase logic (auth + Firestore + types)
├── lib/
│   ├── types.tsx           ← TypeScript types (Event, Organizer, etc.)
│   ├── events.tsx          ← Mock seed events (dev fallback)
│   └── eventFeed.ts        ← Feed cache + Firebase/mock merge logic
├── components/
│   └── FloatingNavigation.tsx ← Animated bottom nav bar
├── constants/
│   └── theme.ts
└── assets/                 ← Logo, icons, images
```

---

## 🔑 Services Used

| Service | Purpose |
|---|---|
| Firebase (`thirdspace-8092b`) | Auth, Firestore DB, Storage |
| Vercel | Web hosting, CI/CD |
| thethirdspaceapp.com | Custom domain |
| Google Cloud Console | OAuth Client IDs |
| Stripe | Payments (setup needed) |
| n8n | AI recommendations (future) |

> All credentials and configuration values: **`../SERVICES_AND_KEYS.md`**

---

## 🎨 Design Vision

- **Discover view:** Full-screen immersive event cards, swipeable, edge-to-edge with blur overlays
- **Navigation:** Floating animated pill nav bar that gently bobs up and down, adapts color to background
- **Event creation:** Rich form with music track, photos/videos, capacity, access control
- **Tone:** Dark, minimal, bold — `#111827` near-black with `#6366F1` indigo accents

---

## 📋 Handover Documentation

The full handover package lives in the parent directory:

| File | Contents |
|---|---|
| `../HANDOVER.md` | Project overview, architecture, data schema, feature progress chart, priorities |
| `../SERVICES_AND_KEYS.md` | All Firebase/Vercel/OAuth/Stripe keys, Firestore security rules, indexes |
| `../DEVELOPER_GUIDE.md` | Local setup, codebase tour, task-by-task implementation guides, sprint plan |
| `../GOOGLE_OAUTH_SETUP.md` | Step-by-step Google OAuth setup guide |
