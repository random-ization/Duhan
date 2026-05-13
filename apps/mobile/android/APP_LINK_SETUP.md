# Android App Link Setup

This project now supports both custom-scheme deep links (`hangyeol://...`) and HTTPS App Links for auth recovery + OAuth callback paths.

## 1) Current manifest coverage

`MainComposeActivity` declares verified HTTPS intent filters for:

- `https://hangyeol.app/auth*`
- `https://hangyeol.app/oauth*`
- `https://hangyeol.app/{en|zh|vi|mn}/auth*`
- `https://www.hangyeol.app/...` (same path set)
- `https://koreanstudy.me/...` (same path set)
- `https://www.koreanstudy.me/...` (same path set)

## 2) Asset links file path

The file must be served at:

- `https://hangyeol.app/.well-known/assetlinks.json`
- `https://www.hangyeol.app/.well-known/assetlinks.json`
- `https://koreanstudy.me/.well-known/assetlinks.json`
- `https://www.koreanstudy.me/.well-known/assetlinks.json`

The repo includes:

- `public/.well-known/assetlinks.json`

`vercel.json` is updated to exclude `/.well-known/*` from locale redirects so verification requests can reach the static file directly.

## 3) Fingerprints required before production

`assetlinks.json` currently contains the local debug keystore SHA-256 for internal verification.

Before production rollout, add the release signing key SHA-256 fingerprint(s) for `com.hangyeol.app`.

Get SHA-256 fingerprints:

```bash
# debug
keytool -list -v \
  -keystore apps/mobile/android/app/debug.keystore \
  -alias androiddebugkey \
  -storepass android \
  -keypass android | rg "SHA256"

# release keystore (example)
keytool -list -v \
  -keystore /path/to/release.jks \
  -alias your_release_alias | rg "SHA256"
```

If using Play App Signing, include the Play signing certificate SHA-256 shown in Play Console.

## 4) Quick verification

After deployment:

```bash
# Check file is publicly reachable
curl -I https://hangyeol.app/.well-known/assetlinks.json

# Open auth deep link through Android resolver
adb shell am start -W \
  -a android.intent.action.VIEW \
  -d "https://hangyeol.app/zh/auth/verify-email?token=demo"
```

Expected behavior: app opens directly and routes into the auth flow screen.

## 5) OAuth redirect base switch

Android now supports configurable OAuth callback base URL:

- Build config: `OAUTH_REDIRECT_BASE_URL`
- Env key for Gradle: `HANGYEOL_OAUTH_REDIRECT_BASE_URL`

Behavior:

- if empty: fallback to `hangyeol://auth/oauth-callback?...` (current compatible path)
- if set (example `https://hangyeol.app`): OAuth uses `https://hangyeol.app/auth/oauth-callback?...`

Example:

```bash
export HANGYEOL_OAUTH_REDIRECT_BASE_URL="https://hangyeol.app"
```
