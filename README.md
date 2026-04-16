# Hour Beeper

A minimal iOS-first Expo app for experimenting with recurring hourly chimes.

## Current status

This repo was bootstrapped from a minimal Expo shell and aggressively pruned down to a single-purpose app foundation. The current shell intentionally keeps only the pieces that materially help this product:

- Expo Router app entry
- lightweight provider composition
- jotai + `expo-sqlite` persistence helper
- direct Expo app scripts for local development

Everything unrelated to the hourly chime app was left behind instead of being imported, including auth, analytics, feature flags, backend API code, chat, huddles, inventory, widgets, live activities, OTA/release automation, and old product docs.

## Getting started

```sh
bun install
bun dev
```

To run directly on a booted iOS simulator:

```sh
bun ios
```

## Planned feature work

- Shared persisted schedule/settings model
- Notification-based delivery mode
- AlarmKit-based delivery mode for supported iOS versions
- A single settings-first screen for comparing both modes
- Lightweight diagnostics for dogfooding
