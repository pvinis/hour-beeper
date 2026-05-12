---
title: fix: Normalize Android chime audio and scheduling
type: fix
status: active
date: 2026-05-12
---

# fix: Normalize Android chime audio and scheduling

## Overview

Fix two Android chime issues together because they share the same scheduled-notification surface: the bundled WAV assets do not have consistent perceived loudness, and Android scheduling fails for every preset except `every-minute` because the app sends Expo `calendar` triggers that Android does not support.

The scheduling fix is known: keep `every-minute` as a repeating `timeInterval`, but convert Android wall-clock schedules to Expo `daily` triggers with explicit hour/minute pairs. The audio fix should normalize or replace the bundled WAV files so all sounds feel equally loud while keeping their distinct tone/frequency character.

## Execution Status

- Completed: **Unit 1** — added `check:sounds` loudness guardrail.
- Completed: **Unit 2** — normalized bundled WAV active RMS to ~-16 dBFS with peak headroom.
- Completed: **Unit 3** — Android wall-clock schedules now build Expo `daily` triggers instead of unsupported `calendar` triggers.
- Partially complete: **Unit 4** — documented Android trigger validation notes; physical-device validation is still pending.

## Problem Frame

Users should be able to choose any bundled chime and any supported schedule on Android with predictable results:

- Bellio, Low, Mid, and Classic should differ by tone, not by attention-grabbing volume.
- `Every 1 min` currently works on Android because it uses `timeInterval`.
- `Every 30 min`, `Hourly`, `Every 2 hours`, `Every 4 hours`, and custom hours currently fail with `Failed to schedule the notification. Trigger of type: calendar is not supported on Android.` because Android receives Expo `calendar` triggers.

## Requirements Trace

- R1. All bundled chime WAVs have matched perceived loudness with safe peak headroom.
- R2. Sound IDs, filenames, labels, preview assets, notification assets, and Android channels remain aligned.
- R3. Android can schedule every supported preset without sending unsupported `calendar` triggers.
- R4. iOS wall-clock scheduling behavior remains unchanged unless implementation proves a shared trigger representation is safer.
- R5. Reconciliation can compare existing scheduled Android requests correctly after the trigger-shape change.
- R6. Tests cover trigger adaptation, Android request counts, sound metadata alignment, and asset-loudness guardrails.

## Scope Boundaries

- No new sound picker UX.
- No new bundled sound IDs or labels.
- No user-uploaded sounds or per-hour sound overrides.
- No native Android scheduling module in this pass; stay inside Expo Notifications unless Expo `daily` proves insufficient on device.
- No exact-alarm permission work unless Android validation shows unacceptable delivery drift after the `daily` fix.

## Context & Research

### Relevant Code and Patterns

- `src/features/chime/notificationEngine.ts` owns notification request construction, Android channel binding, Expo trigger adaptation, fingerprinting, and reconciliation.
- `src/features/chime/schedule.ts` owns preset/custom schedule expansion to local times.
- `src/features/chime/sounds.ts` owns the sound catalog, notification filenames, Android channel IDs, and native sound path exports.
- `src/features/chime/soundPreviewAssets.ts` maps sound IDs to the same bundled WAVs used for previews.
- `app.config.ts` registers Android notification sounds through the Expo Notifications plugin.
- `src/features/chime/notificationEngine.test.ts` already locks request shapes, reconciliation behavior, and Android channel scheduling.
- `src/features/chime/sounds.test.ts` already locks catalog/path/channel alignment.
- `docs/android-validation.md` already lists Android scheduled-delivery and sound-channel validation checks.

### Evidence Gathered During Debugging

- Existing tests pass, but they encode the wrong Android expectation: Android hourly/every-30 currently expect `calendar` triggers with channel IDs.
- Expo SDK 55 exposes `SchedulableTriggerInputTypes.DAILY` for hour/minute repeats and marks `CalendarTriggerInput` as iOS-oriented.
- Expo Notifications Android native scheduling accepts `daily` and `timeInterval`; the observed error is the expected failure path for unsupported `calendar`.
- Current WAV measurements from repo assets:
  - `assets/sounds/bellio_beep.wav`: 0.813s, file RMS about -15.8 dBFS, peak 0.0 dBFS.
  - `assets/sounds/soft_beep.wav`: 0.180s, file RMS about -15.6 dBFS, peak -12.0 dBFS.
  - `assets/sounds/classic_beep.wav`: 0.180s, file RMS about -11.1 dBFS, peak -7.5 dBFS.
  - `assets/sounds/digital_beep.wav`: 0.180s, file RMS about -12.6 dBFS, peak -9.1 dBFS.
- Bellio's full-scale peak and much longer duration likely explain why it feels louder/more intrusive even when file-wide RMS looks similar to Low.

### Institutional Learnings

- Recent Android support work emphasizes physical-device validation before calling Android release-ready.
- Existing sound-preview work intentionally shares sound identity between preview and scheduled notifications, so asset replacement with stable filenames should update both surfaces.

### External References

- Expo Notifications SDK 55 local notification trigger types in `node_modules/expo-notifications/build/Notifications.types.d.ts`.
- Expo Notifications Android scheduler parser in `node_modules/expo-notifications/android/src/main/java/expo/modules/notifications/notifications/scheduling/NotificationScheduler.kt`.

## Key Technical Decisions

- **Normalize assets, not playback gain.** Android notification channel sounds and foreground previews should use the same files. Per-platform gain hacks would not reliably affect notification delivery and would create drift between preview and actual chime.
- **Keep filenames stable if possible, but do not accept stale Android channel sounds.** Replace the bytes of `bellio_beep.wav`, `classic_beep.wav`, `digital_beep.wav`, and `soft_beep.wav` in place so catalog/config changes are not needed. If existing installed Android channels keep playing cached old sounds after the asset replacement, implementation must either version the affected channel IDs in this pass or explicitly scope the fix to fresh installs/reinstalls before release.
- **Use perceived loudness plus peak limits, not raw RMS alone.** Bellio demonstrates why file-wide RMS is insufficient: duration, frequency content, and full-scale peaks affect perceived loudness.
- **Use Android `daily` triggers for wall-clock schedules.** Android `daily` supports explicit hour/minute repeaters; `calendar` does not. Minute-only schedules must expand to explicit hour/minute pairs on Android.
- **Keep iOS compact calendar triggers.** iOS can keep one `minute: 0` calendar trigger for hourly and two minute-only calendar triggers for every-30-minutes; Android can have a platform-specific expanded plan.
- **Expect one reconciliation migration.** Android identifiers/fingerprints may change from calendar-shaped requests to daily-shaped requests. Reconciliation should cancel owned stale requests and schedule the new daily requests deterministically.

## Open Questions

### Resolved During Planning

- **Why does `every-minute` work while the others fail?** `every-minute` uses `timeInterval`; the other presets/custom hours use `calendar`, which Expo Android rejects.
- **Can Android use one minute-only daily trigger for hourly?** No. Expo `daily` requires explicit `hour` and `minute`, so hourly needs 24 daily triggers and every-30-minutes needs 48 daily triggers.
- **Should loudness be fixed in code or assets?** Assets. Notification sounds are native resources/channel sounds, so file normalization is the reliable shared fix.

### Deferred to Implementation

- **Exact loudness target:** Pick a target after listening on device, but start with a conservative target such as equal integrated/active loudness with true peak below roughly -3 dBFS.
- **Android channel cache behavior after asset replacement:** Validate on an installed device. If channels retain old sound behavior, implementation may need versioned channel IDs or channel recreation guidance.
- **Delivery drift for many daily triggers:** Validate on physical Android hardware before making public support claims.

## Implementation Units

- [x] **Unit 1: Add asset loudness measurement and guardrails**

**Goal:** Make the loudness problem measurable and prevent future bundled sounds from drifting badly.

**Requirements:** R1, R2, R6

**Dependencies:** None

**Files:**
- Create: `scripts/check-sound-loudness.ts`
- Modify: `package.json`
- Test: `src/features/chime/sounds.test.ts`
- Read/measure: `assets/sounds/bellio_beep.wav`
- Read/measure: `assets/sounds/classic_beep.wav`
- Read/measure: `assets/sounds/digital_beep.wav`
- Read/measure: `assets/sounds/soft_beep.wav`

**Approach:**
- Add a small script that reads the bundled WAV files and reports duration, peak dBFS, file RMS, and active-window RMS or another deterministic proxy for perceived loudness.
- Fail only on objective safety/alignment checks initially: invalid WAV, clipping/full-scale peak, missing catalog asset, or loudness delta outside an agreed threshold.
- Keep the script dependency-light. If introducing a true LUFS library is heavier than the app warrants, document the proxy and keep physical listening validation as the final check.
- Wire the script into a package script such as `check:sounds` so future sound changes can run it explicitly.

**Patterns to follow:**
- `src/features/chime/sounds.test.ts` for catalog/path alignment.
- Existing `scripts/*.ts` style for Bun/TypeScript utility scripts.

**Test scenarios:**
- Happy path — every catalog sound has a readable WAV file and a measured loudness report.
- Happy path — all measured assets stay within the chosen loudness tolerance.
- Edge case — a clipped/full-scale peak fails the guardrail.
- Edge case — a catalog entry without an asset fails before shipping.

**Verification:**
- Running the sound check prints per-file metrics and fails for unsafe loudness/peak drift.

- [x] **Unit 2: Normalize or replace the bundled WAV assets**

**Goal:** Make all bundled sounds feel like the same loudness while preserving distinct tone/frequency identities.

**Requirements:** R1, R2

**Dependencies:** Unit 1

**Files:**
- Modify: `assets/sounds/bellio_beep.wav`
- Modify: `assets/sounds/classic_beep.wav`
- Modify: `assets/sounds/digital_beep.wav`
- Modify: `assets/sounds/soft_beep.wav`
- Modify if filenames change: `src/features/chime/sounds.ts`
- Modify if filenames change: `app.config.ts`

**Approach:**
- Prefer replacing the WAV bytes in place using the same filenames, sample format, and Android-resource-safe names.
- Normalize each asset to the selected perceived-loudness target and leave peak headroom to avoid clipping on device speakers.
- Shorten or attenuate Bellio if needed; its current 0.813s duration and 0 dBFS peak make it perceptually much more prominent than the 0.180s Low sound.
- Re-run catalog/path/channel tests after replacement.
- Rebuild/reinstall Android before judging notification sound changes because native resources and channels are build/install artifacts.
- Treat stale existing-channel playback as a blocking implementation decision, not a documentation-only observation: if an upgrade install preserves old channel sounds, add versioned Android channel IDs and update channel/fingerprint tests before considering R1/R2 complete.

**Patterns to follow:**
- `src/features/chime/sounds.ts` as the single sound metadata source.
- `src/features/chime/soundPreviewAssets.ts` so preview and notification delivery continue to use aligned files.

**Test scenarios:**
- Happy path — sound metadata tests still pass after asset replacement.
- Happy path — `check:sounds` reports all assets within tolerance and below the peak ceiling.
- Integration — foreground preview and scheduled Android notification both use the replaced asset for each sound.
- Edge case — pre-existing Android channels are inspected after reinstall/upgrade to verify the expected sound is actually used.

**Verification:**
- On a physical Android device, preview and scheduled notification playback no longer make Bellio obviously louder than Low at the same system volume.

- [x] **Unit 3: Add Android daily trigger support to notification requests**

**Goal:** Represent Android wall-clock schedules with supported `daily` triggers while leaving iOS calendar behavior intact.

**Requirements:** R3, R4, R5, R6

**Dependencies:** None

**Files:**
- Modify: `src/features/chime/notificationEngine.ts`
- Test: `src/features/chime/notificationEngine.test.ts`

**Approach:**
- Extend internal trigger types, normalized trigger records, data `triggerType`, and fingerprints to include `daily`.
- Teach `toExpoTriggerInput` to emit `Notifications.SchedulableTriggerInputTypes.DAILY` for daily triggers.
- Build platform-specific slots:
  - iOS/default: keep existing compact `calendar` behavior.
  - Android `every-minute`: keep one repeating `timeInterval` request.
  - Android `hourly`: expand to 24 daily hour/minute triggers at `HH:00`.
  - Android `every-30-minutes`: expand to 48 daily hour/minute triggers at `HH:00` and `HH:30`.
  - Android `every-2-hours`, `every-4-hours`, custom: use their explicit schedule times as daily triggers.
- Keep Android channel IDs attached to each request's trigger.
- Choose stable identifiers that include enough slot information to avoid collisions, for example `daily.09-00` rather than a minute-only key.

**Execution note:** Start with failing tests that assert Android no longer produces `calendar` triggers for any wall-clock schedule.

**Patterns to follow:**
- Existing `buildNotificationRequests` and `getNotificationSlots` separation in `src/features/chime/notificationEngine.ts`.
- Existing fingerprint tests around stale request replacement and unchanged reconciliation.

**Test scenarios:**
- Happy path — Android hourly builds 24 daily triggers with channel IDs and no calendar triggers.
- Happy path — Android every-30-minutes builds 48 daily triggers covering `:00` and `:30` for every hour.
- Happy path — Android every-2-hours/every-4-hours/custom hours build daily triggers for the exact schedule times.
- Happy path — iOS/default hourly and every-30-minutes keep the current compact calendar trigger shape.
- Happy path — `every-minute` remains one Android timeInterval trigger.
- Edge case — daily trigger fingerprints include hour, minute, and channel ID so unchanged reconciliation is stable.
- Integration — reconciliation cancels stale owned calendar requests and schedules the daily plan.
- Error path — scheduling failure during the expanded Android plan is surfaced and retry remains deterministic.

**Verification:**
- No Android request passed to Expo has `type: calendar` except in normalized records from old/stale requests being compared or canceled.

- [ ] **Unit 4: Validate Android scheduling and channel behavior on device**

**Goal:** Prove the fixes work in the Android environment that previously failed.

**Requirements:** R1, R3, R5

**Dependencies:** Units 2 and 3

**Files:**
- Modify: `docs/android-validation.md`
- Optional: `README.md`

**Approach:**
- Build/install a development Android build after asset and trigger changes.
- Validate every preset and one custom-hours schedule from the app UI.
- Confirm the previous error no longer appears for non-minute presets.
- Confirm scheduled requests are visible/healthy where Expo exposes them.
- Validate the selected Android channel sound after changing sounds on both a fresh install and an upgrade/install-over-existing-app path when possible.
- Make channel caching an acceptance gate: if existing channels retain old sound files after upgrade, either implement versioned channel IDs before marking this plan complete or record that Android sound normalization is only accepted for fresh installs/reinstalls and keep public Android support wording conservative.

**Patterns to follow:**
- `docs/android-validation.md` existing checklist language and Android support posture.

**Test scenarios:**
- Integration — `Every 30 min` schedules without throwing and fires at `:00`/`:30` under normal conditions.
- Integration — `Hourly` schedules without throwing and fires at `:00`.
- Integration — `Every 2 hours`, `Every 4 hours`, and custom hours schedule without throwing.
- Integration — changing the selected sound schedules future notifications through the matching Android channel.
- Integration — foreground preview and background scheduled notification are comparably loud for each bundled sound.

**Verification:**
- `docs/android-validation.md` is updated with observed pass/fail notes for scheduling and sound-channel checks.

## System-Wide Impact

- **Interaction graph:** Settings UI updates atoms; reconciliation builds notification requests; Expo Notifications schedules them; Android channels determine delivered sound.
- **Error propagation:** Scheduling errors should still surface through existing reconciliation failure handling rather than being swallowed.
- **State lifecycle risks:** Android may need to migrate from old calendar-shaped owned requests to new daily-shaped requests; reconciliation should cancel stale owned requests once.
- **API surface parity:** Foreground preview and notification delivery both use the same WAV assets; iOS and Android may intentionally differ only in trigger representation.
- **Integration coverage:** Unit tests prove request shapes, but physical Android validation is required for delivered notification timing, channel sounds, and channel caching.
- **Unchanged invariants:** Sound IDs remain `bellio`, `mid`, `classic`, `low`; the app does not add new sound settings or new schedule options.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Android daily expansion schedules many requests, especially 48 for every-30-minutes. | Keep request counts bounded, test counts explicitly, and validate on device before claiming support. |
| Android channels may cache old sounds even after WAV replacement. | Validate fresh install and upgrade behavior; if stale channels persist, implement versioned channel IDs in this pass or explicitly limit acceptance to fresh installs/reinstalls before release. |
| Loudness proxy may not match perceived loudness on phone speakers. | Use metrics as guardrails, then rely on physical-device listening validation for acceptance. |
| Changing trigger identifiers causes one-time rescheduling. | Reconciliation already cancels owned stale requests; add tests for migration from old calendar records. |
| Exact delivery timing may drift under Doze/battery saver. | Validate normal conditions first; document degraded lifecycle behavior separately in `docs/android-validation.md`. |

## Documentation / Operational Notes

- Update `docs/android-validation.md` with the actual device/build tested and which schedule/sound checks passed.
- If Android channel IDs are versioned to refresh sounds, note that users may see new channel entries in Android settings.
- Keep README Android support wording conservative until the validation checklist passes on physical hardware.

## Sources & References

- Related code: `src/features/chime/notificationEngine.ts`
- Related code: `src/features/chime/schedule.ts`
- Related code: `src/features/chime/sounds.ts`
- Related code: `src/features/chime/soundPreviewAssets.ts`
- Related code: `app.config.ts`
- Tests: `src/features/chime/notificationEngine.test.ts`
- Tests: `src/features/chime/sounds.test.ts`
- Validation: `docs/android-validation.md`
- Expo SDK 55 trigger types: `node_modules/expo-notifications/build/Notifications.types.d.ts`
- Expo Android scheduler parser: `node_modules/expo-notifications/android/src/main/java/expo/modules/notifications/notifications/scheduling/NotificationScheduler.kt`
