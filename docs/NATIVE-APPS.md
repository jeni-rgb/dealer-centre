# Native apps (iOS and Android)

The app is the live website wrapped in a native shell (Capacitor). The shell adds push
notifications, the home screen icon and the App Store / Play Store listing. There is no
second codebase: every change to the site is in the apps the moment it is deployed.

## What works today, without any accounts
- Web push on Android (Chrome) and on iPhone once the site is added to the home screen
  (Share, Add to Home Screen). Today screen shows "Turn on notifications".
- Needs `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` in Vercel (generated, see vapid.txt).

## To build the native apps (needs a Mac with Xcode for iOS; Android Studio for Android)
```
npm install
npx cap add ios
npx cap add android
npx cap sync
npx cap open ios      # Xcode: set the team, bundle id uk.co.thedealercentre.app, Push Notifications capability
npx cap open android  # Android Studio: build > generate signed bundle
```
`capacitor.config.ts` points the shell at https://thedealercentre.co.uk (override with `CAP_SERVER_URL` for testing).

## Push for the native apps
1. Firebase project (free) → add iOS and Android apps with the bundle id above.
2. iOS: upload the APNs key from the Apple Developer account into Firebase > Cloud Messaging.
3. Firebase > Project settings > Service accounts > Generate new private key.
   Put the JSON on one line in Vercel as `FCM_SERVICE_ACCOUNT`.
4. Android: place `google-services.json` in `android/app/`. iOS: `GoogleService-Info.plist` in `ios/App/App/`.
The server already sends to native tokens through FCM once that variable exists.

## Accounts needed (only for publishing)
- Apple Developer Program: £79 a year, company name, takes a few days to approve.
- Google Play Console: one off $25.

## Store listing copy
Name: Dealer Centre
Subtitle: Sell on the floor and online, never twice
Description: For antique and vintage dealers who rent a pitch. List an item once, print its label,
and the ticket number runs the centre's till, your Shopify and the centre's online shop.
A buzz on your phone when it sells. Statements that add themselves up.
Category: Business. Age rating: 4+.
