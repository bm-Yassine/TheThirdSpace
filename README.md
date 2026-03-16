# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.


TO-DO
** Allow payments to book a place in the event through stripe. which allows to send money between users.
** Use Firebase or Clerk to manage authentication and loggin and signup for users.
** Use n8n to create and manage models that suggest the ordering and suggestions of the events according to profile, interests, previous events, weather, mood, personality ...
** Make logo.png the website's logo
** Make smooth discover view page, with a lot of animations and user interaction visuals
** Add the map for finding the events using a map service, and pins with the location of each event, maybe can show maps only per city you are located in, and can change city if needed.

Currently working on 
1) Production OAuth setup
- Replace remaining placeholder Google OAuth IDs with real ios/android/web IDs.
- Add Vercel production domain in Firebase Auth authorized domains : 

2) Vercel deployment hardening
- Confirm Vercel project uses:
  - Build command: npx expo export --platform web
  - Output directory: dist
  - Rewrites from vercel.json are active

3) App package updates (recommended by Expo CLI)
- Align Expo-related packages to expected SDK-compatible versions listed by expo start.

4) Stripe real integration
- Replace simulated payment with actual Stripe checkout + webhook/confirmation flow.

5) Firestore security rules and indexes
- Lock writes to authenticated users and resource owners.
- Add required indexes for event/conversation queries.

6) Profile creation and editing screen.

7) Map View, opens a similar to google maps view with pins on the location of the activities and events in the city.

8) Choose a song and background photo/video when creating an event.
