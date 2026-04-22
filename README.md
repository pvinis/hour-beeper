# Hour Beeper

A minimal iOS-first Expo app that emits a brief recurring beep at selected times — inspired by old Casio watch hourly chimes.

## Delivery

Hour Beeper now ships with a single delivery path:

| Path | How it works | Tradeoff |
| --- | --- | --- |
| **Notifications** | Schedules local notifications with a custom bundled sound. Works on all supported iOS versions. | Uses grouping and best-effort cleanup to keep the stack small, but terminated-app delivery may still leave visible artifacts. |

## Bundled Sounds

- **Casio** (default) — Casio F-91W inspired chime
- **Classic** — 880 Hz sine beep
- **Soft** — 660 Hz gentle tone
- **Digital** — 1200 Hz digital beep

## Diagnostics

Use the in-app diagnostics section to track:

- notification permission state
- last reconciliation time
- scheduled artifact count
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

> **Note:** Physical-device testing is still required for notification delivery, custom sound playback, Notification Center cleanup behavior, and reboot/relaunch alignment.
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

- Android port once the iOS schedule and delivery model stabilizes
- iCloud or cross-device sync investigation
- Brand identity work (app name, icon, copy polish)
