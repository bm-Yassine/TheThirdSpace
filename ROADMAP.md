# Roadmap

Where The Third Space stands and where it's going.

This project was designed, built, set down, and later picked back up and
substantially reworked. The design work that preceded the code is in
[`design/`](design/).

---

## Done

**Identity**
- New mark: three circles meeting, their shared centre filled — the third space
  is where people's circles meet. Full icon, splash and favicon set in
  `design/logo/`

**Foundations**
- Real scheduling: `startsAt` / `endsAt` / `durationMinutes`, with fallbacks so events created before the model existed still sort and render
- Auth resolved through a provider that waits for Firebase to restore the session, instead of a synchronous read that reports signed-in users as logged out
- Cross-platform date / time / duration picker with no native dependency
- Firestore security rules, version-controlled and deployed
- 68 unit tests over the pure logic: scheduling, participation, filtering

**Core flows**
- Profile creation and editing, interests, reputation
- Event creation, **editing**, and **cancellation** with attendee notification
- Discovery across three views: Discover (immersive), Cards (scan and filter), Map (location)
- **Search and filtering** on Cards — query, type, tags, price band, date band
- Favourites
- Join / request approval / pay / waitlist, with transactional capacity and automatic waitlist promotion
- Organizer attendee management: approve, decline, work the waitlist, message anyone
- Realtime 1:1 chat
- Post-event ratings in both directions, with reputation aggregated from real ratings
- Profile history: hosting, upcoming, attended
- Stripe Checkout with the price read server-side
- Demo mode — the whole app explorable without an account
- Media and audio upload to Firebase Storage, with rules
- Locations resolved to real coordinates via OpenStreetMap, so created events
  appear on the map
- Real audio playback in Discover
- Profile photos
- Privacy policy and terms, linked from signup and the profile
- Account deletion that cascades across events, messages, ratings and files
- Reporting and blocking, with reports write-only so nobody can see who
  reported them
- Email verification on signup, with a retry from the profile

---

## Next

### 1. "Near me" on the map
`expo-location` with permission handling, centring the map on the user instead
of the median of all events. Falls back to the current behaviour when
permission is denied.

### 2. Share an event link
Deep link per event, native share sheet on mobile and clipboard on web. This is
how events actually spread, and it's small.

### 3. Attendee list visible to attendees
Only the organizer can see who is coming. "Who else is going" is one of the
strongest reasons someone commits, and the data is already there.

### 4. Recommendation engine for Discover
Discover's ordering is deliberately left alone by the filter work — filtering
belongs on Cards. The Discover feed is meant to be **ordered**, not filtered:
ranked by mood, location, what's happening nearby, what's trending, and the
user's personality and past attendance.

This is the most ambitious item and needs deciding before it's built:
- What signals are captured, and how they're gathered without being invasive
- Whether ranking runs client-side, in a serverless function, or through n8n
- A cold-start ordering for users with no history
- How a user sees and corrects why something was surfaced

### 5. Motion and flow pass
The identity is done — the mark, splash and icons ship. What remains is motion.

- Loading and empty states with character rather than a bare spinner
- Transitions between the three discovery views
- The join confirmation, and the moment a waitlist place is promoted
- Onboarding for a first-time user landing on an empty feed

---

## Later

- Google OAuth (hidden behind a flag until real iOS and Android client IDs exist)
- Push notifications — approvals, waitlist promotion, cancellations, and event reminders currently reach people only through chat
- Copyright-free music library for event creation
- Reporting and blocking
- Attendee list visible to attendees, not only the organizer
- Recurring events

---

## Known limitations

- **The privacy policy and terms have not been reviewed by a lawyer.** They
  describe what the app actually does, which is the part that matters most, but
  they are a starting point rather than legal advice.
- **Reports have no moderation queue.** They are written to `reports` and are
  only readable from the Firebase console or the Admin SDK. Reviewing them is
  currently a manual job.
- **Blocking is one-directional in the feed.** A blocked person's events are
  hidden from the blocker, but the blocked person can still see the blocker's
  events. Making it symmetric needs a server-side query.

- **Cancellation notifies through chat**, because that's the only channel the app has. Push notifications would make it reliable.
- **`getEvents` fetches then sorts client-side.** Fine at current scale; it should become a server-side `where(status) orderBy(startsAt)` query, which is what the composite index in `firestore.indexes.json` anticipates.
- **Reputation is computed on read.** Correct and secure, but it's a query per profile view. If profiles get hot, move aggregation to a Cloud Function writing a denormalised summary — which needs the trusted server the client can't provide.
- **Editing an event doesn't notify attendees.** The form says so, but moving an event's date should probably message people the way cancelling does.
