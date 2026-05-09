# 🛠️ The Third Space — Developer Guide

> This guide explains how to run the project locally, understand its structure, and pick up development from where it was left off.
>
> **Read first:** [`HANDOVER.md`](./HANDOVER.md) for the full project overview and progress charts.  
> **Keys & services:** [`SERVICES_AND_KEYS.md`](./SERVICES_AND_KEYS.md) for all credentials.

---

## ⚡ Quick Start (Local Development)

### Prerequisites

Make sure you have the following installed:

```bash
node --version    # v18+ recommended
npm --version     # v9+
npx expo --version  # installed via npm
```

Install Expo CLI globally if not already:
```bash
npm install -g expo-cli
```

### 1. Clone / Open the Project

```bash
# The project root is the monorepo:
cd /Users/yb/Dev/Coding/Expo/TheThirdSpace

# Or wherever you have it cloned
```

### 2. Install Dependencies

```bash
cd TheThirdSpace
npm install
```

> If you see peer dependency warnings, they are mostly safe to ignore for development.

### 3. Start the Dev Server

```bash
npx expo start
```

This opens the Expo DevTools in your terminal. From there:

| Key | Action |
|---|---|
| `w` | Open in web browser (http://localhost:8081) |
| `i` | Open in iOS Simulator (macOS only) |
| `a` | Open in Android emulator |
| `s` | Switch to Expo Go app |

### 4. Test on Your Phone

Install **Expo Go** from the App Store or Google Play, then scan the QR code shown after `npx expo start`.

> ⚠️ Some features (like `react-native-get-random-values`) work differently in Expo Go vs a native build. For full Firebase auth on mobile, a development build may be needed.

---

## 🧭 Understanding the Codebase

### Navigation Model

The app uses **Expo Router** (file-based routing, similar to Next.js):

```
app/
  index.tsx         → "/" — auto-redirects to /home
  login.tsx         → "/login"
  home.tsx          → "/home" — shell for 3 view modes
  home/
    DiscoverView.tsx → rendered inside /home when viewMode='discover'
    CardsView.tsx    → rendered inside /home when viewMode='cards'
    MapView.tsx      → rendered inside /home when viewMode='map'
  create.tsx        → "/create"
  activity_detail.tsx → "/activity_detail?eventId=xxx"
  favorites.tsx     → "/favorites"
  chats.tsx         → "/chats" (also: "/chats?otherUserId=xxx" or "?conversationId=xxx")
  profile.tsx       → "/profile"
  organizer_info.tsx → "/organizer_info?organizerName=x&organizerUid=y"
  payment.tsx       → "/payment?eventId=x&amount=25&title=EventName"
```

All navigation uses `router.push()`, `router.replace()`, and `router.back()` from `expo-router`.

### Auth State

Auth state is managed in `Backend/firebase.ts` via `authService`:

```typescript
// Check if logged in
const user = authService.getCurrentUser();  // Returns Firebase User | null

// Listen for changes
authService.onAuthStateChange((user) => {
  if (user) { /* logged in */ }
  else { /* logged out */ }
});
```

The `FloatingNavigation` component subscribes to auth state and redirects to `/login` if the user tries to access protected screens (`create`, `favorites`, `chats`, `profile`) without being logged in.

### Event Feed Logic

Events come from two sources, merged together:

1. **Firebase Firestore** (`events/` collection) — real user-created events
2. **Mock events** (`lib/events.tsx`) — static seed data for development/fallback

The merge happens in `lib/eventFeed.ts`:
- A 2-minute TTL cache prevents excessive Firestore reads
- If Firestore fails, it falls back to mock events only
- When you create an event, `upsertCachedEvent()` adds it instantly to the cache so it appears in the feed without waiting for a refetch

### The `dataService` Object

Everything that talks to Firestore lives in `Backend/firebase.ts` under `dataService`:

```typescript
// Events
dataService.createEvent(eventData)
dataService.getEvents({ organizerId?, limit? })
dataService.getEvent(eventId)
dataService.updateEvent(eventId, updates)
dataService.deleteEvent(eventId)

// Profiles
dataService.getUserProfile(uid)
dataService.getCurrentUserProfile()
dataService.updateUserProfile(uid, updates)
dataService.createUserProfile(uid, data)

// Favorites
dataService.addToFavorites(eventId)
dataService.removeFromFavorites(eventId)
dataService.getUserFavorites()
dataService.isFavorite(eventId)

// Commitments (joining events)
dataService.commitToEvent(eventId, { paymentCompleted? })
dataService.cancelCommitment(eventId)
dataService.getUserCommitments()
dataService.getUserCommitment(eventId)

// Messaging
dataService.getOrCreateConversation(otherUserId)
dataService.getUserConversations()
dataService.getConversationMessages(conversationId)
dataService.sendMessage(conversationId, text)

// Payments
dataService.recordPayment(eventId, amount, method, status)
```

---

## 🔧 Environment Setup

### Local `.env` File

Create `TheThirdSpace/.env.local` for local development (not committed to git):

```env
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyDeExkfYP6q-4x2levBqNzvpYkHGC44X1Y
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=thirdspace-8092b.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=thirdspace-8092b
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=thirdspace-8092b.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=258758943296
EXPO_PUBLIC_FIREBASE_APP_ID=1:258758943296:web:ea21ab65e4fc01aa52b5a5
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=G-TP70FQ8CVT
EXPO_PUBLIC_WEB_CLIENT_ID=258758943296-p4o6gvj7l0f178o8tcf7549qkkiggif1.apps.googleusercontent.com
```

> Note: In Expo, environment variables must be prefixed with `EXPO_PUBLIC_` to be accessible in client-side code.

---

## 🚀 Deployment to Vercel

### Manual Deploy

```bash
cd TheThirdSpace

# Build the web export
npx expo export --platform web
# This outputs to: TheThirdSpace/dist/

# Deploy (using Vercel CLI)
npx vercel --prod
```

### Automatic Deploy (Git push)

If the Vercel project is connected to a Git repo:
1. Push to your main branch
2. Vercel automatically runs: `npx expo export --platform web`
3. Deploys the `dist/` folder
4. Available at https://thethirdspaceapp.com

### Vercel Project Settings to Verify

In Vercel Dashboard → Project → Settings → General:
- **Build Command:** `npx expo export --platform web`
- **Output Directory:** `dist`
- **Root Directory:** `TheThirdSpace` (important — the project is in a subdirectory)

In Vercel Dashboard → Project → Settings → Environment Variables:
- Add all the `EXPO_PUBLIC_*` variables listed in `SERVICES_AND_KEYS.md`

---

## 🏗️ Key Development Tasks

### Task 1: Complete Google OAuth

**File to edit:** `TheThirdSpace/app/login.tsx`

Currently the Google button shows "Coming Soon". To enable it:

1. Create iOS and Android OAuth client IDs (see `GOOGLE_OAUTH_SETUP.md`)
2. Add the IDs to environment variables
3. Replace the `handleGoogleSignIn` function:

```typescript
// In login.tsx - replace handleGoogleSignIn with:
import * as Google from 'expo-auth-session/providers/google';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../Backend/firebase';

const [request, response, promptAsync] = Google.useAuthRequest({
  androidClientId: process.env.EXPO_PUBLIC_ANDROID_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_IOS_CLIENT_ID,
  webClientId: process.env.EXPO_PUBLIC_WEB_CLIENT_ID,
});

useEffect(() => {
  if (response?.type === 'success') {
    const { id_token } = response.params;
    const credential = GoogleAuthProvider.credential(id_token);
    signInWithCredential(auth, credential)
      .then(async (result) => {
        await dataService.ensureUserProfileFromAuthUser(result.user);
        router.replace('/home');
      })
      .catch((e) => setErr(e.message));
  }
}, [response]);

// Then in the button:
<TouchableOpacity onPress={() => promptAsync()} disabled={!request}>
  <Text>Continue with Google</Text>
</TouchableOpacity>
```

---

### Task 2: Real Stripe Payment Integration

**File to edit:** `TheThirdSpace/app/payment.tsx`

The current `handlePay()` function fakes a delay. Replace with:

**Step A — Create a Vercel serverless function** (`TheThirdSpace/api/create-payment-intent.ts`):

```typescript
// api/create-payment-intent.ts (Vercel serverless)
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export default async function handler(req: any, res: any) {
  const { amount, eventId } = req.body;
  
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Stripe uses cents
    currency: 'usd',
    metadata: { eventId },
  });
  
  res.json({ clientSecret: paymentIntent.client_secret });
}
```

**Step B — Update payment.tsx**:

```typescript
// Replace the setTimeout block in handlePay():
const response = await fetch('/api/create-payment-intent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ amount, eventId }),
});
const { clientSecret } = await response.json();

// Then use Stripe.js or @stripe/stripe-react-native to confirm payment
// using the clientSecret
```

---

### Task 3: Real-time Chat with Firestore `onSnapshot`

**File to edit:** `TheThirdSpace/app/chats.tsx`

Currently messages are loaded once. Replace the load logic with a real-time listener:

```typescript
import { onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { db } from '../Backend/firebase';

// In the component, replace loadMessages() call with:
useEffect(() => {
  if (!selectedConversationId) return;
  
  const q = query(
    collection(db, 'conversations', selectedConversationId, 'messages'),
    orderBy('createdAt', 'asc')
  );
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const msgs = snapshot.docs.map(doc => ({
      id: doc.id,
      conversationId: selectedConversationId,
      ...doc.data()
    })) as ChatMessage[];
    setMessages(msgs);
  });
  
  return () => unsubscribe(); // cleanup on unmount
}, [selectedConversationId]);
```

---

### Task 4: Firestore Security Rules

Go to [Firebase Console → Firestore → Rules](https://console.firebase.google.com/project/thirdspace-8092b/firestore/rules) and replace the current rules with the production rules from `SERVICES_AND_KEYS.md`.

---

### Task 5: Complete Map View

**File to edit:** `TheThirdSpace/app/home/MapView.tsx`

The map view screen exists but needs implementation. Events have `latitude` and `longitude` fields in the schema. Use `react-native-maps` (already installed) to show pins:

```typescript
import MapView, { Marker } from 'react-native-maps';

// In the component:
<MapView
  style={{ flex: 1 }}
  initialRegion={{
    latitude: userLatitude,
    longitude: userLongitude,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  }}
>
  {events
    .filter(e => e.latitude && e.longitude)
    .map(event => (
      <Marker
        key={String(event.id)}
        coordinate={{ latitude: event.latitude!, longitude: event.longitude! }}
        title={event.title}
        description={event.location}
        onPress={() => router.push({ pathname: '/activity_detail', params: { eventId: String(event.id) } })}
      />
    ))
  }
</MapView>
```

> For web: `react-native-maps` on web requires the Google Maps API key in `app.json`. See `SERVICES_AND_KEYS.md` section 4.

---

### Task 6: Profile Photo Upload

**Files to edit:** `TheThirdSpace/app/profile.tsx` + `Backend/firebase.ts`

Use Firebase Storage to upload images:

```typescript
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../Backend/firebase';
import * as ImagePicker from 'expo-image-picker';

const uploadAvatar = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  
  if (result.canceled) return;
  
  const uri = result.assets[0].uri;
  const blob = await (await fetch(uri)).blob();
  const storageRef = ref(storage, `avatars/${auth.currentUser!.uid}`);
  await uploadBytes(storageRef, blob);
  const downloadURL = await getDownloadURL(storageRef);
  
  await dataService.updateUserProfile(auth.currentUser!.uid, { photoURL: downloadURL });
};
```

---

## 🐛 Common Issues & Fixes

### Issue: "FirebaseError: Missing or insufficient permissions"
**Cause:** Firestore security rules are blocking the query.  
**Fix:** Temporarily set rules to allow all in test mode, or check the specific rule that is failing.

### Issue: "expo-router: Route not found"
**Cause:** Expo Router can't find the screen file.  
**Fix:** Make sure the file exists in `app/` and has a default export.

### Issue: Events not showing / empty feed on first load
**Cause:** Firestore query is slow or failing, and mock events aren't loading.  
**Fix:** Check console for errors. The `eventFeed.ts` fallback should kick in — if it doesn't, check if `mockEvents` in `lib/events.tsx` is populated.

### Issue: Google Sign-In shows "Coming Soon"
**Cause:** OAuth is intentionally disabled in `login.tsx`.  
**Fix:** See Task 1 above to implement real Google OAuth.

### Issue: Expo export fails for web
**Cause:** Missing peer dependencies or incompatible package versions.  
**Fix:** Run `npx expo install --fix` then retry.

### Issue: "index already exists" or "failed-precondition" from Firestore
**Cause:** Missing Firestore indexes for composite queries.  
**Fix:** Click the link in the error message to create the index in Firebase Console, or add indexes manually as described in `SERVICES_AND_KEYS.md`.

---

## 📦 Dependencies Reference

| Package | Version | Purpose |
|---|---|---|
| `expo` | ~54.0.20 | Core Expo SDK |
| `expo-router` | ~6.0.14 | File-based navigation |
| `firebase` | ^12.5.0 | Firestore, Auth, Storage |
| `react-native` | 0.81.5 | Core RN |
| `react-native-maps` | 1.20.1 | Map view (partial) |
| `expo-image-picker` | ~17.0.8 | Media selection for event creation |
| `expo-auth-session` | ^7.0.8 | OAuth (ready, not yet wired for Google) |
| `lucide-react-native` | ^0.548.0 | Icons |
| `react-native-svg` | 15.12.1 | SVG rendering (used in FloatingNavigation) |
| `nativewind` | ^4.2.1 | Tailwind CSS for React Native |
| `react-native-reanimated` | ~4.1.1 | Advanced animations |

---

## 🗓️ Suggested Sprint Plan for Next Developer

### Sprint 1 — Production Security (1–2 days)
- [ ] Add Firestore security rules (copy from `SERVICES_AND_KEYS.md`)
- [ ] Add Firestore required indexes
- [ ] Verify `thethirdspaceapp.com` is in Firebase authorized domains
- [ ] Test that unauthenticated users cannot write to any collection

### Sprint 2 — Google OAuth (1 day)
- [ ] Create iOS + Android OAuth client IDs in Google Cloud Console
- [ ] Add them to env vars
- [ ] Wire up `expo-auth-session` Google provider in `login.tsx`
- [ ] Test on web + iOS + Android

### Sprint 3 — Stripe Payments (3–4 days)
- [ ] Create Stripe account + get API keys
- [ ] Build Vercel serverless function for PaymentIntent creation
- [ ] Integrate Stripe.js (web) or `@stripe/stripe-react-native` (mobile)
- [ ] Test full payment → commitment → confirmation flow
- [ ] Set up Stripe Connect for peer-to-peer payouts (organizers receiving money)

### Sprint 4 — Map View (1–2 days)
- [ ] Enable Google Maps API key
- [ ] Complete `MapView.tsx` with event pins
- [ ] Add location coordinates when creating events (geocode the address)

### Sprint 5 — Polish & Performance (2–3 days)
- [ ] Real-time chat with `onSnapshot`
- [ ] Profile photo upload via Firebase Storage
- [ ] Feed loading performance (skeleton screens, reduce initial load)
- [ ] DiscoverView visual polish (edge-to-edge, blur, animations)

### Sprint 6 — AI & Smart Features (ongoing)
- [ ] Set up n8n instance
- [ ] Build event recommendation workflow
- [ ] Post-event rating screen (stub exists at `post_event_rating.tsx`)

---

## 🤝 Contribution Notes

- **Color palette:** Primary is `#6366F1` (indigo) for auth screens, `#111827` (near-black) for action buttons
- **Navigation:** Always use `router.push()` for forward navigation and `router.replace()` when you don't want the user to go back (e.g., after login)
- **Auth checks:** Always check `authService.getCurrentUser()` before calling any `dataService` write function
- **Error handling:** Show `Alert.alert()` for user-facing errors — never just `console.log()`
- **TypeScript:** Use the types from `lib/types.tsx` for events — don't create inline types for `Event` or `Organizer`
