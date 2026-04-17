# Hour Beeper

A minimal iOS-first Expo app that emits a brief recurring beep at selected times — inspired by old Casio watch hourly chimes.

## Delivery Modes

V1 ships with **two delivery engines** so the team can compare them on real devices before choosing the long-term default:

| Mode             | How it works                                                                                    | Tradeoff                                                         |
| ---------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **Notification** | Schedules local notifications with a custom bundled sound. Works on all supported iOS versions. | May leave visible notification artifacts in Notification Center. |
| **AlarmKit**     | Uses iOS 26+ system alarms that override Focus and Silent mode.                                 | More prominent system UI; requires newer iOS.                    |

A **temporary delivery-mode switch** is visible in the settings screen during V1 evaluation. It will be removed once the team chooses a default.

## Bundled Sounds

- **Casio** (default) — Casio F-91W inspired chime
- **Classic** — 880 Hz sine beep
- **Soft** — 660 Hz gentle tone
- **Digital** — 1200 Hz digital beep

## Evaluation Rubric

After several days of side-by-side dogfooding, compare:

1. **Delivery reliability** — Did chimes fire within ~60 seconds of the scheduled time while the app was closed?
2. **Notification Center clutter** — How many visible artifacts accumulated per day in notification mode?
3. **Prominence vs annoyance** — Was AlarmKit's system UI too loud for an hourly chime product?
4. **Silent Mode / Focus behavior** — Which mode respected the user's intent better?
5. **Battery impact** — Any noticeable difference in battery drain?

Use the in-app diagnostics section to track reconciliation history, permission states, and artifact counts.

## Getting Started

```sh
bun install
bun dev
```

To run directly on a physical iOS device:

```sh
bun ios
```

> **Note:** Both delivery modes require physical-device testing. Simulator-only validation is insufficient for notification delivery, AlarmKit authorization, custom sound playback, and reboot/relaunch behavior.

## Project Structure

```
assets/sounds/          — Bundled chime .wav files
modules/                — Local Expo native modules
  expo-hour-chime-alarmkit/  — Narrow AlarmKit bridge (iOS 26+)
src/
  app/                  — Expo Router screens
  components/settings/  — Settings UI sections
  features/chime/       — Domain: types, schedule, engines, diagnostics
  hooks/                — React hooks (reconciliation)
  storage/              — Persisted jotai atoms
  utils/                — Shared utilities
```

## Planned Follow-ups

- Remove delivery-mode switch after choosing the long-term default
- Android port once iOS schedule and delivery model stabilizes
- iCloud or cross-device sync investigation
- Brand identity work (app name, icon, copy polish)
