# 🔑 The Third Space — Services, Keys & Account Access

> ⚠️ **SECURITY NOTICE:** This file contains real configuration values that are already embedded in the codebase (`Backend/firebase.ts`). Firebase client-side config is safe to share (it's not a secret — it's baked into every web app). However, **never commit private keys, service account JSON files, or Stripe secret keys** to the repository.

---

## 1. 🔥 Firebase

### Project Details

| Field | Value |
|---|---|
| **Project Name** | The Third Space |
| **Project ID** | `thirdspace-8092b` |
| **Firebase Console URL** | https://console.firebase.google.com/project/thirdspace-8092b |
| **Google Cloud Project URL** | https://console.cloud.google.com/home/dashboard?project=thirdspace-8092b |

### Firebase Web App Configuration

These values are used in `TheThirdSpace/Backend/firebase.ts` and can also be set as Vercel environment variables:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyDeExkfYP6q-4x2levBqNzvpYkHGC44X1Y
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=thirdspace-8092b.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=thirdspace-8092b
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=thirdspace-8092b.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=258758943296
EXPO_PUBLIC_FIREBASE_APP_ID=1:258758943296:web:ea21ab65e4fc01aa52b5a5
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=G-TP70FQ8CVT
```

> These values are **already hardcoded as fallbacks** in `firebase.ts`. For production hardening, move them to Vercel environment variables only and remove the hardcoded fallbacks.

### Google OAuth Client IDs

| Platform | Client ID | Status |
|---|---|---|
| **Web** | `258758943296-p4o6gvj7l0f178o8tcf7549qkkiggif1.apps.googleusercontent.com` | ✅ Created — needs authorized domains |
| **iOS** | *(not yet created)* | ❌ Needs setup |
| **Android** | *(not yet created)* | ❌ Needs setup |

**Environment variables for OAuth:**
```env
EXPO_PUBLIC_WEB_CLIENT_ID=258758943296-p4o6gvj7l0f178o8tcf7549qkkiggif1.apps.googleusercontent.com
EXPO_PUBLIC_IOS_CLIENT_ID=       ← Add when created
EXPO_PUBLIC_ANDROID_CLIENT_ID=   ← Add when created
```

### Firebase Services Enabled

| Service | Status | Notes |
|---|---|---|
| Authentication | ✅ Active | Email/Password enabled. Google provider set up but OAuth IDs pending |
| Firestore Database | ✅ Active | Currently in **test mode** (open rules — needs tightening) |
| Storage | ✅ Configured | Firebase Storage initialized but not used for uploads yet |
| Analytics | ⚪ Optional | Measurement ID configured, not actively tracked |

### ⚠️ Firestore Security Rules — Current State (DEV ONLY)

The database is currently running in **test/open mode**. Before going live, replace rules in Firebase Console → Firestore → Rules with something like:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Anyone can read events, only auth users can create
    match /events/{eventId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null 
                            && request.auth.uid == resource.data.createdBy;
    }

    // Users can only read/write their own profile and sub-collections
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;

      match /favorites/{eventId} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
      match /commitments/{eventId} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
      match /joinedEvents/{eventId} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
      match /createdEvents/{eventId} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
    }

    // Conversations: only participants can read/write
    match /conversations/{conversationId} {
      allow read, write: if request.auth != null 
                         && request.auth.uid in resource.data.participantIds;
      allow create: if request.auth != null;

      match /messages/{messageId} {
        allow read: if request.auth != null
                    && request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participantIds;
        allow create: if request.auth != null;
      }
    }

    // Payments: only the payer can read their records
    match /payments/{paymentId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null 
                  && request.auth.uid == resource.data.payerUid;
    }
  }
}
```

### Firestore Required Indexes

If you see "index required" errors in the console, create these in Firebase Console → Firestore → Indexes:

| Collection | Fields | Order |
|---|---|---|
| `events` | `createdBy` ASC, `createdAt` DESC | Composite |
| `conversations` | `participantIds` ARRAY_CONTAINS + `updatedAt` DESC | Composite |
| `conversations/{id}/messages` | `createdAt` ASC | Single field |

### Firebase Authorized Domains

Go to **Firebase Console → Authentication → Settings → Authorized domains** and verify these are listed:

- `localhost`
- `thirdspace-8092b.firebaseapp.com`
- `thirdspace-8092b.web.app`
- `thethirdspaceapp.com` ← **Custom domain — verify this is added!**

---

## 2. 🌐 Vercel (Web Deployment)

### Project Details

| Field | Value |
|---|---|
| **Vercel Dashboard** | https://vercel.com/dashboard |
| **Project Name** | TheThirdSpace (or similar) |
| **Live URL** | https://thethirdspaceapp.com |
| **Framework** | None (static Expo export) |

### Vercel Build Configuration (`vercel.json`)

```json
{
  "framework": null,
  "buildCommand": "npx expo export --platform web",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

> **Important:** The project root for Vercel should be set to `TheThirdSpace/` (not the monorepo root), or the build command should be `cd TheThirdSpace && npx expo export --platform web`.

### Vercel Environment Variables

Add these in Vercel Dashboard → Project → Settings → Environment Variables:

```
EXPO_PUBLIC_FIREBASE_API_KEY           = AIzaSyDeExkfYP6q-4x2levBqNzvpYkHGC44X1Y
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN       = thirdspace-8092b.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID        = thirdspace-8092b
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET    = thirdspace-8092b.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = 258758943296
EXPO_PUBLIC_FIREBASE_APP_ID            = 1:258758943296:web:ea21ab65e4fc01aa52b5a5
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID    = G-TP70FQ8CVT
EXPO_PUBLIC_WEB_CLIENT_ID              = 258758943296-p4o6gvj7l0f178o8tcf7549qkkiggif1.apps.googleusercontent.com
```

### Custom Domain

| Field | Value |
|---|---|
| **Domain** | `thethirdspaceapp.com` |
| **Managed by** | Vercel (DNS configured in Vercel) |
| **SSL** | Auto-managed by Vercel |

---

## 3. 💳 Stripe (Payments — NOT YET LIVE)

### Current Status

The payment screen (`app/payment.tsx`) is **simulated**. It shows a card form UI and records a payment in Firestore, but does **not** process any real money.

### What Needs to Be Done

1. Create a Stripe account at https://stripe.com
2. Get your **Publishable Key** (frontend) and **Secret Key** (backend/server-side only)
3. Install Stripe SDK: `npm install @stripe/stripe-react-native` (for native) or use Stripe.js for web
4. Create a backend endpoint (e.g., a Vercel serverless function or Firebase Cloud Function) to:
   - Create a `PaymentIntent` using the Stripe Secret Key
   - Return the `client_secret` to the app
5. Replace the `setTimeout` in `payment.tsx` with actual Stripe checkout
6. Set up a webhook to confirm payment success server-side

### Stripe Configuration Placeholders

```env
STRIPE_PUBLISHABLE_KEY=pk_live_...   ← Add when account created
STRIPE_SECRET_KEY=sk_live_...        ← NEVER commit to code or repo
STRIPE_WEBHOOK_SECRET=whsec_...      ← Add when webhook configured
```

> The app intends to support **peer-to-peer payments** (user pays organizer for event tickets). Stripe Connect will be needed for this use case (allows money to be split between platform and organizers).

---

## 4. 🗺️ Maps (react-native-maps)

### Current Status

`react-native-maps` is installed (v1.20.1) and imported. The MapView screen (`app/home/MapView.tsx`) exists but shows a basic shell.

### What Needs to Be Done for a Full Map Experience

For web, `react-native-maps` requires **Google Maps API**:

1. Go to https://console.cloud.google.com
2. Enable **Maps JavaScript API** and **Maps SDK for Android/iOS**
3. Create an API key restricted to your domains
4. Add to your config:

```env
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
```

In `app.json`, add:
```json
{
  "expo": {
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "YOUR_ANDROID_MAPS_KEY"
        }
      }
    }
  }
}
```

---

## 5. 🤖 n8n (AI Recommendations — Future)

### Vision

Use n8n (workflow automation) to build recommendation models that sort events based on:
- User profile & interests
- Previous events joined
- Weather data
- Time of day / mood
- Location

### Not Yet Set Up

n8n has not been configured. To start:
- Self-host n8n or use https://n8n.cloud
- Build a workflow that reads from Firestore and returns a sorted event list
- Call the n8n webhook from `eventFeed.ts` instead of plain Firestore query

---

## 6. 📱 App Stores (Future — Native Builds)

### iOS
- Requires Apple Developer account ($99/year): https://developer.apple.com
- Bundle ID will need to be set in `app.json` (currently not set — placeholder only)
- Need `GoogleService-Info.plist` from Firebase for native iOS builds

### Android
- Requires Google Play Console account ($25 one-time): https://play.google.com/console
- Package name needs to be set in `app.json`
- Need `google-services.json` from Firebase for native Android builds

### These files are NOT in the repository
The `.gitignore` (should) exclude:
```
google-services.json
GoogleService-Info.plist
```

---

## 7. 📋 Quick Reference: All IDs & Keys at a Glance

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FIREBASE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Project ID:            thirdspace-8092b
Sender/Project Number: 258758943296
API Key (web):         AIzaSyDeExkfYP6q-4x2levBqNzvpYkHGC44X1Y
Auth Domain:           thirdspace-8092b.firebaseapp.com
Storage Bucket:        thirdspace-8092b.firebasestorage.app
App ID:                1:258758943296:web:ea21ab65e4fc01aa52b5a5
Measurement ID:        G-TP70FQ8CVT

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GOOGLE OAUTH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Web Client ID:         258758943296-p4o6gvj7l0f178o8tcf7549qkkiggif1.apps.googleusercontent.com
iOS Client ID:         (not created yet)
Android Client ID:     (not created yet)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VERCEL / DOMAIN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Live URL:              https://thethirdspaceapp.com
Vercel Dashboard:      https://vercel.com/dashboard

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STRIPE (NOT YET SET UP)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Publishable Key:       (get from stripe.com)
Secret Key:            (get from stripe.com - NEVER in code)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GOOGLE MAPS (NOT YET SET UP)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Maps API Key:          (get from Google Cloud Console)
```
