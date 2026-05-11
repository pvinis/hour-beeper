# SwiftUI Parity Validation

Use this checklist to compare the native SwiftUI app with the current Expo app.

## Automated parity

- Schedule materialization matches hourly, every-minute, every-30-minutes, every-2-hours, every-4-hours, and custom-hour behavior.
- Notification planning creates stable identifiers, slot keys, trigger shapes, thread identifiers, and sound filenames.
- Reconciliation is idempotent when pending requests already match.
- Disabled or blocked settings clear only Hour Beeper-owned pending requests.
- Legacy owned date-trigger requests report `migrated` when replaced.
- Sound catalog filenames resolve from the app bundle root.
- Diagnostics cap history at 50 entries and record errors non-fatally.

## Simulator smoke test

- App launches to the settings-first Home screen.
- Enabling chimes requests notification permission.
- Preset and custom schedules update the status summary.
- Sound selection updates the selected row and attempts foreground preview.
- Diagnostics update after reconciliation.

## Physical-device dogfood

- Hourly creates one pending repeater and delivers a custom sound while the app is closed.
- Every 30 minutes creates two repeaters.
- Every 2 hours creates 12 repeaters.
- Every 4 hours creates 6 repeaters.
- A sparse custom schedule creates one repeater per selected hour.
- Foreground delivery plays sound without showing a banner/list.
- Notification Center cleanup keeps clutter bounded when the app receives notifications or becomes active.
- Focus, DND, Silent Mode, reboot/relaunch, force-kill, timezone, DST, and manual clock behavior are observed and documented.
