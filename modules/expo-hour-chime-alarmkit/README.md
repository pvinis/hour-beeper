# expo-hour-chime-alarmkit

Local Expo module for Hour Beeper's narrow AlarmKit bridge.

## Scope

This module intentionally exposes only the pieces the app needs:

- availability checks
- authorization status + prompting
- scheduling repeating alarm artifacts
- canceling all scheduled alarm artifacts created by the app
- listing the stored scheduled artifact metadata

The JavaScript schedule domain remains the source of truth. This module is an iOS adapter only.
