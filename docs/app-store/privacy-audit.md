# Hour Bell Privacy Audit

Last updated: 2026-05-13

## Summary

Current release candidate appears eligible for App Store Connect **Data Not Collected**, assuming no additional production SDKs/services are added before submission.

## Evidence checked

### Dependencies

`package.json` production dependencies include Expo/React Native UI, local notifications, local audio, constants, linking, SQLite, Jotai, Luxon, gesture/screen/safe-area libraries, Tailwind helpers, and Uniwind.

No obvious production dependency for:

- analytics
- ads
- tracking/attribution
- crash reporting
- account/login/auth
- remote database/backend
- payment processing
- server push notifications

### Code search

Searched app code and docs for common data-collection and networking surfaces:

- `analytics`, `track`
- `sentry`, `crash`
- `firebase`
- `amplitude`, `mixpanel`, `segment`, `posthog`
- `supabase`
- `fetch(`, `axios`, `http`, `https`
- `admob`, `ads`
- `login`, `account`, `user`
- `getExpoPushToken`, `push token`, `registerForPush`

Findings:

- The app schedules local notifications through `expo-notifications`.
- No Expo push token registration path was found.
- Settings are stored locally through `src/storage/persist.ts` and related Jotai atoms.
- Diagnostics are local app state, not uploaded telemetry.
- Search hits for privacy/data language were primarily in planning docs, not runtime data collection.

## User data behavior

Hour Bell stores these on device:

- chime enabled/disabled state
- chosen schedule
- chosen sound
- lightweight diagnostic state, such as permission/scheduling status and reconciliation history

Hour Bell does not currently appear to transmit these values off-device.

## App Privacy answer

Recommended App Store Connect answer, if this remains true at submission time:

- **Data Not Collected**

## Privacy policy alignment

The public privacy policy should say:

- Hour Bell does not collect personal data.
- Settings and diagnostics remain on the device.
- Local notification permission is used only for user-configured chimes.
- The app does not use accounts, ads, analytics, tracking, or a cloud backend.

## Re-check triggers

Re-run this audit if any of these are added:

- analytics or crash reporting
- remote logging
- account/login
- cloud sync
- push notification token registration
- ads/attribution SDKs
- payment/subscription SDKs
- support chat SDKs
- any API request that sends user/device/app data to a server
