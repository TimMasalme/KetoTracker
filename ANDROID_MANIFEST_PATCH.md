# Android Manifest – Required Permissions

After running `npx cap add android`, add these entries to
`android/app/src/main/AndroidManifest.xml` inside the `<manifest>` tag:

```xml
<!-- Bugfix 1: Camera permission for Barcode Scanner -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />

<!-- Bugfix 2: Local Notifications – survive device reboot -->
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

For `SCHEDULE_EXACT_ALARM` on Android 12+, the user also needs to grant
"Alarms & Reminders" in system settings. You can open that screen with:
```ts
await LocalNotifications.requestPermissions()
```
which `useNotifications.ts` already does correctly.

---

# iOS – Info.plist

After running `npx cap add ios`, add these keys to
`ios/App/App/Info.plist`:

```xml
<!-- Bugfix 1: Camera permission for Barcode Scanner -->
<key>NSCameraUsageDescription</key>
<string>KetoTrack needs camera access to scan barcodes.</string>

<!-- Bugfix 2: Local Notifications (no extra plist key needed;
     handled by @capacitor/local-notifications plugin automatically) -->
```
