# Hour Bell

A minimal Expo app that emits a brief recurring bell at selected times — inspired by classic digital watch hourly chimes.

> Android support is implemented/configured, with release-readiness gated on the physical-device checklist in `docs/android-validation.md`.

## Delivery

Hour Bell now ships with a single delivery path:

| Path | How it works | Tradeoff |
| --- | --- | --- |
| **Notifications** | Schedules slot-based repeating local notifications with a custom bundled sound. Works on supported iOS builds and Android builds after device validation. | Uses grouping and best-effort cleanup to keep the stack small, but terminated-app delivery may still leave visible artifacts. Android delivery also depends on notification permission, channel settings, and OEM battery behavior. |

## Bundled Sounds

Tap any bundled sound in the app to play a short foreground preview. Preview playback is app-owned UI feedback configured to mix with other media. Foreground scheduled chimes also use app-owned playback when Hour Bell can safely handle the notification while active. Background, locked, and terminated scheduled delivery still follows the OS notification path and should be validated on a physical device.

- **Bellio** (default) — classic digital watch-inspired chime
- **Mid** — 1200 Hz digital beep
- **Classic** — 880 Hz sine beep
- **Low** — 660 Hz gentle tone

## Diagnostics

Use the in-app diagnostics section to track:

- notification permission state
- last reconciliation time
- scheduled repeater count (`hourly` = `1`, `every-30-minutes` = `2`, `every-2-hours` = `12`)
- current app version / git commit

## Getting Started

```sh
bun install
bun dev
```

> **Note:** The repo currently pins and patches `uniwind@1.6.2` during `postinstall` to avoid React Native 0.83 startup warnings from deprecated core exports. If you upgrade Uniwind, rerun `bun run verify:uniwind` and validate that the compatibility patch is still correct.

To run directly on a physical iOS device:

```sh
bun ios
```

For Simulator-only work:

```sh
bun x expo run:ios
```

To run Android locally:

```sh
bun android
```

Android EAS build helpers mirror the iOS scripts:

```sh
bun build:dev:and
bun build:stag:and
bun build:prod:and
bun run:android
```

Play Store submission is intentionally not configured yet; validate Android behavior first with `docs/android-validation.md`.

> **Note:** Physical-device testing is still required for repeating notification delivery, custom sound playback, foreground sound preview behavior (including silent switch and volume observations), media-continuity behavior while Apple Music/Podcasts/Spotify or Android media apps are playing, Notification Center cleanup behavior, reboot/relaunch alignment, and timezone/DST/local-clock validation.
>
> If you previously ran an older internal AlarmKit dogfood build, do a manual reset/uninstall before testing the current notification-only app.

## Project Structure

```
assets/sounds/          — Bundled chime .wav files
src/
  app/                  — Expo Router screens
  components/settings/  — Settings UI sections
  features/chime/       — Domain: schedule, notifications, diagnostics
  hooks/                — React hooks (reconciliation)
  storage/              — Persisted jotai atoms
  utils/                — Shared utilities
```

## Planned Follow-ups

- Complete Android physical-device validation before claiming release-ready support
- Play Store / Android EAS submit setup after validation
- iCloud or cross-device sync investigation
- Brand identity work (app name, icon, copy polish)
