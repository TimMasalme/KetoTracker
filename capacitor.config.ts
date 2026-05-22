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
    // Bugfix 1: Camera permission config for Capacitor
    Camera: {
      permissionType: 'camera',
    },
    // Bugfix 2: Local Notifications config
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#5d8a5e',
      sound: 'beep.wav',
    },
  },
  // Android: res/mipmap icons are handled by capacitor-assets
  // iOS: Assets.xcassets/AppIcon.appiconset – run: npx capacitor-assets generate
  // Source icon: public/web-app-manifest-512x512.png (512×512 RGBA PNG)
}

export default config
