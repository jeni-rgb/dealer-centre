import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native wrapper. The app itself is the live site; the shell adds push notifications,
 * the camera and an icon on the home screen. Run `npx cap add ios` / `npx cap add android`
 * on a Mac with Xcode (iOS) or Android Studio to generate the native projects.
 */
const config: CapacitorConfig = {
  appId: "uk.co.thedealercentre.app",
  appName: "Dealer Centre",
  webDir: "public",
  server: { url: process.env.CAP_SERVER_URL ?? "https://thedealercentre.co.uk", cleartext: false },
  ios: { contentInset: "automatic", backgroundColor: "#FDFBEF" },
  android: { backgroundColor: "#FDFBEF" },
  plugins: { PushNotifications: { presentationOptions: ["badge", "sound", "alert"] } },
};

export default config;
