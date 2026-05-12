# Android Validation

Use this checklist before calling Android support release-ready. Until the core checks pass on a physical device, describe Android as implemented/configured with validation pending.

## Build and install

- [ ] Development Android build uses `com.pvinis.hourbeeper.dev` and installs beside staging/production.
- [ ] Staging Android build uses `com.pvinis.hourbeeper.stag` and installs beside development/production.
- [ ] Production Android build uses `com.pvinis.hourbeeper` and does not auto-submit to Play Store.
- [ ] Generated Android resources include all bundled notification sounds under `res/raw` with underscore-safe filenames.
- [ ] Generated Android manifest includes `android.permission.POST_NOTIFICATIONS`.

## Permissions and channels

- [ ] Android 13+ device prompts for notification permission only after the user enables chimes.
- [ ] Denying permission leaves the app in a clear blocked state with settings guidance.
- [ ] Android 12-or-lower device does not show a runtime notification prompt and still schedules when notifications are globally enabled.
- [ ] Each bundled sound has a corresponding Android notification channel.
- [ ] Disabling app notifications globally is reflected in the app after relaunch/foreground if the platform exposes it.
- [ ] Disabling the effective sound channel is reflected as blocked/degraded if the platform exposes it.

## Scheduled delivery

Validate under normal conditions first; the product target is roughly within 60 seconds of the intended boundary during dogfooding.

Implementation note (2026-05-12): Android wall-clock schedules should use Expo `daily` triggers with explicit hour/minute pairs. `Every 1 min` remains a `timeInterval` trigger. If any non-minute preset fails with `Trigger of type: calendar is not supported on Android`, the installed build is stale or the trigger adapter regressed.

- [ ] Hourly schedule fires at `:00`.
- [ ] Every-30-minutes schedule fires at `:00` and `:30`.
- [ ] Every-2-hours and every-4-hours schedules fire only on their expected hours.
- [ ] Custom selected hours fire at `HH:00` and skipped hours do not fire.
- [ ] Changing schedule while enabled reconciles old requests and schedules the new slots.
- [ ] Changing sound while enabled schedules future chimes through the new sound channel.
- [ ] Foreground delivery plays the selected sound without stacking visible in-app alerts.
- [ ] Foreground delivery plays the selected sound while another media app is playing, and the media app continues afterward.
- [ ] Background delivery plays the selected sound.
- [ ] Background delivery behavior while another media app is playing is recorded in `docs/media-continuity-validation.md`.
- [ ] Locked-screen delivery behavior while another media app is playing is recorded in `docs/media-continuity-validation.md`.
- [ ] Terminated-app delivery plays the selected sound, or any limitation is documented.
- [ ] Terminated-app delivery behavior while another media app is playing is recorded in `docs/media-continuity-validation.md`.
- [ ] Force-stopped app behavior is observed and documented as unsupported/degraded if future notifications do not fire until relaunch.

## Device lifecycle

- [ ] Reboot with chimes enabled preserves or restores expected scheduled delivery.
- [ ] Relaunch after reboot reconciles diagnostics and scheduled artifacts.
- [ ] Manual clock changes realign future chimes to device-local time after relaunch/foreground.
- [ ] Timezone changes realign future chimes to device-local time after relaunch/foreground.
- [ ] DST transition behavior is tested directly when feasible, or covered by a manual clock/timezone proxy.
- [ ] Battery saver/Doze behavior is observed separately from normal-condition pass/fail.
- [ ] At least one Pixel-class device and one OEM-skinned device, if available, are tested for channel/scheduling behavior.

## Notification tray behavior

- [ ] Multiple fired chimes do not accumulate beyond the current documented cleanup behavior.
- [ ] Tapping a chime notification opens Hour Bell.
- [ ] Dismissing a notification does not break future chimes.
- [ ] Hour Bell cleanup does not dismiss unrelated app notifications.
- [ ] Dev/staging/production notifications are distinguishable by app label/icon/channel context.

## Upgrade scenarios

- [ ] Upgrade with chimes enabled reconciles existing scheduled artifacts.
- [ ] Upgrade after changing the selected sound preserves future delivery through the intended channel.
- [ ] Upgrade after adding channel audio attributes schedules through the new versioned channel IDs and records whether old pre-attribute channels remain visible in system settings.
- [ ] Upgrade after disabling/mutating one channel does not silently report healthy delivery if the platform exposes the problem.
- [ ] Upgrade from an older build with missing Android channels recreates missing channels.

## Go / no-go

Android can be described as supported when the core permission, channel sound, scheduled delivery, and reboot/relaunch checks pass under normal conditions on physical hardware.

If core checks fail, keep README wording at "Android validation pending" or "Android experimental" and create a follow-up plan for native Android scheduling/channel remediation before making public support claims.
