# CarPlay Notification Beeps Validation

Hour Beeper's CarPlay support is notification-driven. The app registers the `hourbeeperchime` notification category with Expo's iOS `allowInCarPlay` option, requests notification permission with `allowDisplayInCarPlay`, and schedules the existing local notification chimes with the same bundled sound filenames.

This is not a dedicated CarPlay app, does not request CarPlay audio entitlements, and does not add background audio playback. iOS settings, Focus, Silent Mode, notification volume, and CarPlay's per-app notification controls can still suppress or alter delivery.

## Capability gate

Verified against installed dependencies:

- `expo-notifications@55.0.21` exposes `requestPermissionsAsync({ ios: { allowDisplayInCarPlay: true } })` through `IosNotificationPermissionsRequest`.
- `expo-notifications@55.0.21` exposes `setNotificationCategoryAsync(identifier, actions, { allowInCarPlay: true })` through `NotificationCategoryOptions`.
- `NotificationContentInput` supports `categoryIdentifier`.
- Expo documents that `allowInCarPlay` requires apps to be approved for CarPlay to make use of the feature; physical validation is therefore required before closing GitHub issue #6.

## Closure criteria for issue #6

Close the issue only after recording physical CarPlay evidence that shows:

- A scheduled local notification with category `hourbeeperchime` is audible through CarPlay while the app is backgrounded or the phone is locked.
- A terminated / force-killed app scenario was attempted and the result is recorded.
- At least one bundled Hour Beeper sound is validated. If custom sounds are suppressed or replaced, compare against the default notification sound and record whether the result satisfies “any audible beep” vs. selected-sound fidelity.
- Upgraded-user behavior is documented: old category-less repeaters migrate only after the app is opened and reconciliation runs.
- README language remains provisional until physical evidence exists.

## Test setup record

Fill one row per run.

| Date      | Build / commit | Device + iOS | Car / head unit or simulator | App state | Prior install state | Schedule  | Sound     | Focus / Silent Mode | Show in CarPlay | Observed route + result | Pass?     | Notes     |
| --------- | -------------- | ------------ | ---------------------------- | --------- | ------------------- | --------- | --------- | ------------------- | --------------- | ----------------------- | --------- | --------- |
| _pending_ | _pending_      | _pending_    | _pending_                    | _pending_ | _pending_           | _pending_ | _pending_ | _pending_           | _pending_       | _pending_               | _pending_ | _pending_ |

## Required scenarios

### Physical CarPlay acceptance scenarios

| Scenario                      | Setup                                                                                                            | Action                                                                       | Expected result                                                                                  |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Backgrounded app              | Enable notifications, select a bundled sound, connect to physical CarPlay, verify app notifications are allowed. | Put app in background before the next scheduled beep.                        | Beep is audible through the car audio route and notification behavior is recorded.               |
| Locked phone                  | Same as above.                                                                                                   | Lock the phone before the next scheduled beep.                               | Beep is audible through the car audio route or platform suppression is recorded.                 |
| Terminated app                | Same as above, with repeaters already scheduled.                                                                 | Force-kill the app before the next scheduled beep.                           | Result is recorded honestly; if delivery differs from backgrounded state, note the iOS behavior. |
| Upgraded user                 | Install/authorize a pre-CarPlay build and schedule repeaters, then upgrade to this build.                        | Open the upgraded app so reconciliation runs, then validate through CarPlay. | Pending requests are migrated to category-bearing repeaters before validation.                   |
| CarPlay disconnected fallback | Enable chimes and schedule repeaters.                                                                            | Disconnect CarPlay before the next scheduled beep.                           | Normal iPhone notification sound behavior remains unchanged.                                     |

### Settings and environment checks

Record each setting rather than treating failures as app bugs immediately:

- Per-app **Show in CarPlay** on/off if iOS exposes it.
- Per-app **Sounds** on/off.
- Deliver Quietly / Scheduled Summary state, if available.
- Driving Focus / Do Not Disturb on/off.
- Silent Mode on/off.
- Active car media playback vs. no media.
- Car / iPhone notification volume.
- Default notification sound comparison if a bundled `.wav` is suppressed or replaced.

### Simulator-limited checks

Simulator validation can confirm request shape and category registration code paths, but it is insufficient for issue closure because it cannot prove audible routing through a real car audio system.

Use simulator only for:

- App still schedules the expected number of repeaters.
- Requests contain `categoryIdentifier: "hourbeeperchime"` after category registration succeeds.
- Existing category-less pending repeaters are replaced after reconciliation.
- Unsupported/degraded category registration leaves ordinary phone notification requests category-less.

## Escalation criteria

Open a separate native CarPlay / entitlement investigation only if category-bearing local notifications fail to produce an audible beep under normal allowed settings after ruling out:

- Notification permission denial.
- Per-app Sounds disabled.
- Show in CarPlay disabled or unavailable.
- Focus / DND / Silent Mode suppression.
- Notification volume or active media routing issues.
- Bundled custom sound asset routing problems, compared with the default notification sound.
