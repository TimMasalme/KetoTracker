import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'de.timmasalme.ketotrack',
  appName: 'KetoTrack',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#f8f4ec',
      showSpinner: false,
    },
  },
  // Android: res/mipmap icons are handled by capacitor-assets
  // iOS: Assets.xcassets/AppIcon.appiconset – run: npx capacitor-assets generate
  // Source icon: public/web-app-manifest-512x512.png (512×512 RGBA PNG)
}

export default config
