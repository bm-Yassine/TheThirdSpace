# Google OAuth Setup Guide

This guide will help you set up production-ready Google OAuth authentication for The Third Space app.

## Prerequisites

- Access to [Google Cloud Console](https://console.cloud.google.com/)
- Access to [Firebase Console](https://console.firebase.google.com/)
- Your app's domain (for web, e.g., `thirdspace.vercel.app`)

## Step 1: Firebase Project Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `thirdspace-8092b`
3. Navigate to **Authentication** → **Sign-in method**
4. Enable **Google** as a sign-in provider
5. Note down the **Web SDK configuration** (you already have this in `firebase.ts`)

## Step 2: Google Cloud Console Setup

### 2.1 Access OAuth Consent Screen

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (should be linked to Firebase)
3. Navigate to **APIs & Services** → **OAuth consent screen**
4. Configure the consent screen:
   - **User Type**: External (for public app)
   - **App name**: The Third Space
   - **User support email**: Your email
   - **App logo**: Upload your app icon
   - **Application home page**: Your website URL
   - **Authorized domains**: Add your domains (e.g., `vercel.app`, your custom domain)
   - **Developer contact information**: Your email

### 2.2 Create OAuth Client IDs

Navigate to **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**

#### For Web (Expo Web / Vercel Deployment)

1. **Application type**: Web application
2. **Name**: The Third Space Web
3. **Authorized JavaScript origins**:
   ```
   https://thirdspace.vercel.app
   https://your-custom-domain.com
   http://localhost:19006 (for local testing)
   ```
4. **Authorized redirect URIs**:
   ```
   https://thirdspace.vercel.app/__/auth/handler
   https://your-custom-domain.com/__/auth/handler
   http://localhost:19006/__/auth/handler
   https://auth.expo.io/@your-username/TheThirdSpace
   ```
5. Click **Create** and save the **Client ID**

#### For Android

1. **Application type**: Android
2. **Name**: The Third Space Android
3. **Package name**: Get from `app.json` (e.g., `com.yourcompany.thirdspace`)
4. **SHA-1 certificate fingerprint**: 
   - For development, get from: `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android`
   - For production, use your release keystore
5. Click **Create** and save the **Client ID**

#### For iOS

1. **Application type**: iOS
2. **Name**: The Third Space iOS
3. **Bundle ID**: Get from `app.json` (e.g., `com.yourcompany.thirdspace`)
4. **App Store ID**: (Optional, for published apps)
5. Click **Create** and save the **Client ID**

## Step 3: Update Your App Configuration

Replace the placeholder Client IDs in `TheThirdSpace/app/login.tsx`:

```typescript
const [request, response, promptAsync] = Google.useAuthRequest({
  androidClientId: 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com',
  iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
  webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
});
```

### Finding Your Client IDs

All your Client IDs are available in:
- **Google Cloud Console** → **APIs & Services** → **Credentials**
- They follow the format: `[NUMBER]-[RANDOM_STRING].apps.googleusercontent.com`

## Step 4: Configure Expo App Config

Update `app.json` to include your scheme:

```json
{
  "expo": {
    "scheme": "thirdspace",
    "android": {
      "package": "com.yourcompany.thirdspace",
      "googleServicesFile": "./google-services.json"
    },
    "ios": {
      "bundleIdentifier": "com.yourcompany.thirdspace",
      "googleServicesFile": "./GoogleService-Info.plist"
    }
  }
}
```

## Step 5: Download Configuration Files

### For Android

1. In Firebase Console, go to **Project Settings** → **General**
2. Under "Your apps", select your Android app
3. Download `google-services.json`
4. Place it in the root of your project: `TheThirdSpace/google-services.json`

### For iOS

1. In Firebase Console, go to **Project Settings** → **General**
2. Under "Your apps", select your iOS app
3. Download `GoogleService-Info.plist`
4. Place it in the root of your project: `TheThirdSpace/GoogleService-Info.plist`

## Step 6: Update Environment Variables (for Web)

If deploying to Vercel or similar:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyDeExkfYP6q-4x2levBqNzvpYkHGC44X1Y
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=thirdspace-8092b.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=thirdspace-8092b
EXPO_PUBLIC_WEB_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
```

## Step 7: Test Your Setup

### Test on Web (Local)
```bash
cd TheThirdSpace
npm start
# Press 'w' to open in web browser
```

### Test on Android
```bash
npm run android
```

### Test on iOS
```bash
npm run ios
```

## Common Issues & Solutions

### Issue 1: "Invalid origin for client"
**Solution**: Make sure your website URL is added to "Authorized JavaScript origins" in Google Cloud Console.

### Issue 2: "redirect_uri_mismatch"
**Solution**: Verify all redirect URIs are correctly configured in Google Cloud Console.

### Issue 3: Google Sign-In button not working on mobile
**Solution**: Ensure you've downloaded and placed the `google-services.json` (Android) or `GoogleService-Info.plist` (iOS) files.

### Issue 4: "API key not valid"
**Solution**: 
1. Check that your Firebase API key is correct
2. Ensure the Google Sign-In API is enabled in Google Cloud Console
3. For Android/iOS, make sure the SHA fingerprints match

## Security Best Practices

1. **Never commit** your `google-services.json` or `GoogleService-Info.plist` to public repositories
2. Add them to `.gitignore`:
   ```
   google-services.json
   GoogleService-Info.plist
   ```
3. Use environment variables for sensitive data in production
4. Regularly rotate your API keys and Client IDs
5. Monitor authentication logs in Firebase Console

## Additional Resources

- [Expo AuthSession Documentation](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [Firebase Authentication Documentation](https://firebase.google.com/docs/auth)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)

## Support

If you encounter issues:
1. Check Firebase Console → Authentication → Users to see if users are being created
2. Review browser/app console for error messages
3. Verify all URLs and Client IDs are correctly configured
4. Test with a different Google account

---

**Last Updated**: Mars 2025
