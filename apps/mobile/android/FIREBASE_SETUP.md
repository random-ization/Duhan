# Firebase FCM Setup (Android Compose)

## Why this is needed

Android push registration (`users:registerPushToken`) requires a valid Firebase app config so the client can fetch an FCM token.

## Two supported setup paths

1. Preferred: add `app/google-services.json` (official Firebase flow)
2. Optional fallback: provide runtime `BuildConfig` values via Gradle property or environment variable

Both paths are supported by current code.

## Option A: `google-services.json`

1. In Firebase Console, create/select Android app `com.hangyeol.app`.
2. Download `google-services.json`.
3. Put it at:
   - `apps/mobile/android/app/google-services.json`

When this file exists, the Android module now auto-enables `com.google.gms.google-services` during Gradle build.

`app/google-services.json` is ignored by git in this repo.

## Option B: runtime BuildConfig values

Set these values in one of:

- `apps/mobile/android/gradle.properties` (local only), or
- shell env vars before build

Required:

- `HANGYEOL_FIREBASE_API_KEY`
- `HANGYEOL_FIREBASE_APP_ID`
- `HANGYEOL_FIREBASE_PROJECT_ID`
- `HANGYEOL_FIREBASE_SENDER_ID`

Optional:

- `HANGYEOL_FIREBASE_STORAGE_BUCKET`
- `HANGYEOL_FIREBASE_DATABASE_URL`

Example (`gradle.properties`):

```properties
HANGYEOL_FIREBASE_API_KEY=AIza...
HANGYEOL_FIREBASE_APP_ID=1:1234567890:android:abc123def456
HANGYEOL_FIREBASE_PROJECT_ID=hangyeol-prod
HANGYEOL_FIREBASE_SENDER_ID=1234567890
HANGYEOL_FIREBASE_STORAGE_BUCKET=hangyeol-prod.appspot.com
HANGYEOL_FIREBASE_DATABASE_URL=
```

## Verification

1. Build:
   - `./gradlew :app:compileStagingDebugKotlin`
2. Login on device/emulator.
3. Check Convex `push_subscriptions` has:
   - `platform = "android"`
   - non-empty `fcmToken`
