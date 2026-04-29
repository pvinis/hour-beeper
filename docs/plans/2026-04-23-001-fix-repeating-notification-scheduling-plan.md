---
title: fix: Replace notification batches with repeating slot schedules
type: fix
status: completed
date: 2026-04-23
origin: docs/brainstorms/2026-04-16-hourly-chime-app-requirements.md
deepened: 2026-04-23
---

# fix: Replace notification batches with repeating slot schedules

## Overview

Replace notification mode’s current rolling batch of dated one-off requests with stable repeating requests keyed to logical schedule slots. The goal is to make notification scheduling match the user’s recurring intent, stay well below iOS pending-request limits, and make reconciliation/debugging easier to reason about.

This plan chooses the TODO’s **Path A: repeater-per-slot** strategy for notification mode. It keeps notification scheduling purely local and app-driven — no background top-up dependency, no rolling 24-request replenishment loop, and no attempt to predict a long chain of future dated occurrences.

## Execution Status

- Completed: **Unit 1** — repeating notification requests from logical schedule slots
- Completed: **Unit 2** — trigger-aware reconciliation and migration from one-off batches
- Completed: **Unit 3** — delivered-notification cleanup adapted to stable repeater identities
- Completed: **Unit 4** — diagnostics and docs updated for repeater counts
- Current implementation state: all 4 units complete and merged in `2d29dec` / PR #3. Notification mode now schedules repeaters keyed by logical slots, and diagnostics report repeater counts rather than rolling one-off batch sizes.

## Problem Frame

The current notification engine materializes the next 24 upcoming occurrences from `src/features/chime/schedule.ts` and schedules them as dated `DATE` triggers in `src/features/chime/notificationEngine.ts`. That worked as an initial baseline, but it now creates four concrete problems:

1. it models a recurring user schedule as a finite batch of future one-offs rather than as repeaters
2. it consumes far more pending notification slots than necessary, especially for denser cadences
3. it ties identifiers and cleanup logic to fabricated occurrence timestamps instead of logical slots
4. it makes diagnostics and dogfooding harder to interpret because the pending count reflects a temporary batch window rather than the intended schedule shape

The origin requirements document still governs the product behavior this plan must preserve:

- recurring chimes must remain enable/disable-able and reusable across delivery engines (see origin: `docs/brainstorms/2026-04-16-hourly-chime-app-requirements.md`)
- preset cadences and custom selected hours must stay aligned with the current local clock
- notification mode must continue pursuing the lowest-clutter behavior available without sacrificing closed-app delivery

Recent repo context sharpens the implementation need:

- `TODO.md` explicitly calls for replacing the rolling 24-request batch with repeaters, stable logical-slot identifiers, and cancellation of previous app-owned pending requests before rescheduling
- `plan-review-output.md` flags the iOS pending notification cap and reboot/realignment risk as material concerns
- `docs/plans/2026-04-17-002-fix-grouped-notification-cleanup-plan.md` intentionally deferred broader notification materialization redesign, making this the natural follow-up

## Requirements Trace

- **R1** — users can enable and disable recurring chimes.
- **R2-R4** — preset cadences and custom selected hours continue to map to the correct `:00`-based recurring behavior.
- **R7** — future chimes should follow the current local device clock instead of staying pinned to a stale timezone context.
- **R12** — notification mode should keep pursuing the lowest-clutter behavior available while preserving delivery.
- **R15** — notification mode and AlarmKit mode must continue to operate from the same stored schedule model.
- **TODO scheduling strategy** — choose repeater-per-slot, keep identifiers stable per logical slot, and cancel stale app-owned pending requests before rescheduling.

## Scope Boundaries

- No AlarmKit redesign, removal, or parity changes beyond continuing to share the same schedule model.
- No background fetch or “top-up insurance” path in this pass.
- No new minute-level custom schedule UI beyond the existing presets and custom-hour model.
- No full diagnostics dashboard redesign beyond the minimum needed to keep repeater scheduling understandable.
- No Android-specific scheduling or notification-channel work in this pass.

### Deferred to Separate Tasks

- Whether the `every-minute` preset should be hidden or relabeled in production builds: separate TODO cluster under `TODO.md`.
- Richer diagnostics such as raw trigger dumps, next trigger timestamps, Low Power Mode state, and full pending identifier inspection: separate diagnostics TODO cluster under `TODO.md`.
- Final long-run validation write-up and scheduling-strategy findings note after on-device testing stabilizes.

## Context & Research

### Relevant Code and Patterns

- `src/features/chime/notificationEngine.ts` is the canonical notification boundary. It currently builds the rolling batch, reconciles pending requests, and owns delivered-notification cleanup/runtime bootstrap helpers.
- `src/features/chime/schedule.ts` already normalizes the user’s recurring intent into deterministic `LocalTime[]` values via `getScheduleTimes(...)`. That is the right source of truth for repeater-per-slot scheduling.
- `src/features/chime/alarmkitEngine.ts` already follows the desired semantic shape: one repeating artifact per logical slot, stable `slotKey` values, and fingerprinting based on stable logical identity rather than dated occurrences.
- `src/hooks/useChimeReconciliation.ts` and `src/features/chime/diagnostics.ts` currently record `requestCount` as “scheduled artifacts,” so the meaning of that number must stay understandable once hourly schedules drop from 24 pending one-offs to a single repeater.
- `src/features/chime/notificationEngine.test.ts` already covers reconciliation, runtime cleanup, and no-duplicate rehydrate behavior. It is the strongest existing regression surface for this change.
- `docs/plans/2026-04-17-002-fix-grouped-notification-cleanup-plan.md` established the current “group and keep latest” cleanup posture. This plan must preserve that behavior while removing occurrence-centric scheduling assumptions.

### Institutional Learnings

- There is still no `docs/solutions/` directory in this repo, so the strongest local grounding comes from the current code, recent plans, `TODO.md`, and `plan-review-output.md`.
- `plan-review-output.md` explicitly warns that the rolling-batch model can run into notification-cap and realignment concerns, which reinforces the need to move to logical repeaters.

### External References

- Expo Notifications docs support repeating `timeInterval` triggers and iOS calendar-based repeating triggers, and document that repeating `timeInterval` triggers on iOS require `seconds >= 60`.
- Expo’s `CalendarTriggerInput` supports hour/minute-based repeating schedules and an optional `timezone` field. Leaving timezone unset best matches the product requirement that chimes follow the device’s current local time rather than a previously captured zone.
- Apple’s `UNCalendarNotificationTrigger` docs show that specifying only hour/minute with `repeats: true` produces a wall-clock repeating notification at that matching time.

## Key Technical Decisions

- **Choose repeater-per-slot (Path A) for notification mode.** The app should model recurring schedules directly instead of managing a replenished one-off batch.
- **Use trigger type based on schedule semantics, not one generic strategy.** Hour-aligned schedules should use repeating calendar triggers; the existing `every-minute` preset should use a single repeating 60-second interval trigger as a testing path.
- **Base notification identity on logical slots, not occurrence timestamps.** Stable slot-based identifiers keep rehydrate/debug output understandable and make notification-mode semantics closer to AlarmKit’s `slotKey` model.
- **Keep reconciliation simple and destructive on mismatch.** When the pending app-owned notification plan differs from the desired repeater plan, cancel all app-owned pending requests and seed the desired repeaters in one pass. This doubles as the migration path from old dated one-offs.
- **Preserve notification cleanup, but stop depending on static `scheduledFor` occurrence timestamps.** Repeating requests require cleanup logic to use delivery-time data and slot metadata, not a precomputed occurrence ID that never changes.
- **Do not introduce top-up/background-fetch insurance in this pass.** The scheduling model itself should be correct enough that background recovery is not the primary correctness mechanism.

## Open Questions

### Resolved During Planning

- **Path A or Path B?** Choose **Path A: repeater-per-slot**. The current schedule model is regular enough that repeaters express it directly.
- **How should the existing presets map to repeaters?** Use a minimal logical mapping rather than a 24-item batch.
- **Should the first repeater release add explicit migration code for old one-offs?** Use the existing cancel-and-reschedule reconciliation behavior as the migration path, but make the comparison trigger-aware so the old dated batch is guaranteed to be considered stale.
- **Should hourly use 24 separate repeaters or one top-of-hour repeater?** Use one repeating calendar trigger at `minute: 0`.
- **Should 2-hour / 4-hour / custom-hour schedules use interval triggers?** No — use explicit wall-clock calendar repeaters per selected slot so the behavior stays aligned to local time.

### Deferred to Implementation

- **Whether repeated deliveries from the same request remain individually dismissible through Expo’s `dismissNotificationAsync(identifier)` API.** This needs real-device validation because stable repeater identifiers may behave differently from occurrence-specific identifiers.
- **Whether delivery-time cleanup should order notifications primarily by Expo’s delivered `date` field, raw trigger metadata, or a hybrid tie-break rule.** The implementation should choose the simplest model that survives on-device testing.
- **Whether any additional diagnostics fields are necessary beyond the repeater count/status shift.** This should be decided after seeing how much visibility the existing diagnostics UI still provides.

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

| User schedule shape | Notification trigger strategy | Logical request count | Stable identifier basis | Notes |
|---|---|---:|---|---|
| `hourly` | 1 repeating `calendar` trigger at `minute: 0` | 1 | slot/strategy key | Top of every hour |
| `every-30-minutes` | 2 repeating `calendar` triggers at `minute: 0` and `minute: 30` | 2 | slot/strategy key | One request per half-hour slot |
| `every-2-hours` | 12 repeating `calendar` triggers at `00:00`, `02:00`, … `22:00` | 12 | `HH:00` slot key | Wall-clock aligned |
| `every-4-hours` | 6 repeating `calendar` triggers at `00:00`, `04:00`, … `20:00` | 6 | `HH:00` slot key | Wall-clock aligned |
| `custom` hours | 1 repeating `calendar` trigger per selected hour | N | `HH:00` slot key | Matches current custom-hours model |
| `every-minute` preset | 1 repeating `timeInterval` trigger at `seconds: 60` | 1 | interval strategy key | Testing path; not wall-clock minute-aligned |

## Implementation Units

- [x] **Unit 1: Build repeating notification requests from logical schedule slots**

**Goal:** Replace the current dated-occurrence request builder with a deterministic repeater-per-slot builder that matches the stored schedule model.

**Requirements:** R1, R2-R4, R7, R15

**Dependencies:** None

**Files:**
- Modify: `src/features/chime/notificationEngine.ts`
- Test: `src/features/chime/notificationEngine.test.ts`

**Approach:**
- Replace the current `materializeUpcomingOccurrences(...)`-driven notification request generation with a logical repeater plan derived from `getScheduleTimes(settings.schedule)`.
- Introduce stable logical-slot keys for notification mode, following the spirit of `src/features/chime/alarmkitEngine.ts`’s `slotKey` pattern.
- Map each preset/custom schedule to the trigger strategy in the design table above.
- Keep request content app-owned by preserving `source`, sound metadata, grouping/thread metadata, and the new slot/strategy identity needed for cleanup and debugging.
- Omit explicit timezone pinning on calendar triggers so the schedule remains local-clock relative.

**Execution note:** Implement this unit test-first, starting with pure request-builder assertions for each schedule shape before wiring reconciliation.

**Patterns to follow:**
- `src/features/chime/alarmkitEngine.ts` — stable `slotKey` and fingerprint posture
- `src/features/chime/schedule.ts` — canonical recurring schedule normalization via `getScheduleTimes(...)`
- `src/features/chime/notificationEngine.test.ts` — existing request-generation regression style

**Test scenarios:**
- Happy path — `hourly` produces one repeating calendar request keyed to the top of each hour.
- Happy path — `every-30-minutes` produces exactly two repeating calendar requests for `:00` and `:30`.
- Happy path — custom hours like `[11, 16]` produce two repeating calendar requests with stable logical-slot identifiers.
- Edge case — `every-2-hours` and `every-4-hours` produce the correct slot sets without duplicates or missing hours.
- Edge case — repeating calendar requests omit an explicit timezone so the plan stays tied to the device’s current local clock instead of a captured zone.
- Edge case — the existing `every-minute` preset produces one repeating 60-second interval request rather than a dated batch.
- Edge case — changing the selected sound changes the content payload while leaving slot identity stable.
- Error path — disabled settings or non-notification delivery mode produce no notification requests.

**Verification:**
- Notification request generation no longer emits 24 dated one-offs for recurring schedules.
- Stable logical-slot identifiers are visible in the planned request set.
- The trigger shape for each schedule matches the intended recurring semantics.

- [x] **Unit 2: Make notification reconciliation trigger-aware and migrate old one-off batches safely**

**Goal:** Ensure rehydrate, settings changes, and app updates compare the desired repeater plan correctly and replace stale one-off batches without leaving duplicates behind.

**Requirements:** R1, R7, R15, TODO scheduling strategy

**Dependencies:** Unit 1

**Files:**
- Modify: `src/features/chime/notificationEngine.ts`
- Test: `src/features/chime/notificationEngine.test.ts`

**Approach:**
- Expand the scheduled-notification record shape returned by the Expo adapter so reconciliation can inspect trigger metadata, not just identifier/content.
- Update `hasMatchingNotificationPlan(...)` so it fingerprints identifier + trigger shape + sound/grouping metadata, making repeater rehydrate comparisons deterministic.
- Treat any app-owned scheduled record that still uses a dated `DATE` trigger as stale under the new repeater strategy, even if its count happens to look plausible.
- Keep the existing cancel-before-reschedule posture for app-owned requests so app update, relaunch, settings changes, and delivery-mode switches all share one migration-safe reconciliation path.
- Keep clearing/blocking behavior unchanged when chimes are disabled, notification permission is denied, or the user switches to AlarmKit mode.
- Preserve `requestCount`, but treat it as the count of logical repeaters rather than the size of a temporary future-occurrence window.

**Execution note:** Start with failing reconciliation tests that cover migration from old `DATE`-trigger batches to the new repeater plan, then add a retry-oriented failure case before changing the production matcher.

**Patterns to follow:**
- `src/features/chime/alarmkitEngine.ts` — stable fingerprint comparison and destructive reschedule-on-mismatch behavior
- `src/features/chime/notificationEngine.ts` — current permission and clear/block control flow

**Test scenarios:**
- Happy path — rehydrating with an already matching repeater plan returns `unchanged` and schedules nothing new.
- Happy path — changing sound cancels stale app-owned pending requests and reschedules the same logical slots with the new sound.
- Happy path — changing from one custom-hour set to another removes stale slot requests and schedules only the new slots.
- Edge case — existing app-owned dated `DATE` triggers from the previous build are fully canceled and replaced with repeaters in one reconciliation pass.
- Edge case — a mixed pending set containing old Hour Beeper `DATE` requests plus foreign notifications clears only the Hour Beeper entries and preserves unrelated notifications.
- Error path — denied permission clears app-owned pending requests and schedules nothing new.
- Error path — a scheduling failure after stale requests are canceled is surfaced for diagnostics and leaves the next reconciliation able to retry the full desired repeater set deterministically.
- Integration — switching delivery mode away from notification still tears down notification-owned pending requests completely.
- Integration — an upgrade path of old one-offs -> first reconciliation -> later relaunch converges to the same repeater plan without accumulating duplicate owned requests.

**Verification:**
- The first reconciliation after this change migrates old one-off batches to repeaters without duplicates.
- Subsequent reconciliations are idempotent when the repeater plan already matches.
- A failed reschedule is observable and retryable rather than silently leaving a half-migrated pending set.

- [x] **Unit 3: Adapt delivered-notification cleanup to stable repeater identities**

**Goal:** Preserve the existing grouped/latest cleanup posture even after notification scheduling stops encoding each future occurrence into the request identifier.

**Requirements:** R12, R15

**Dependencies:** Unit 2

**Files:**
- Modify: `src/features/chime/notificationEngine.ts`
- Test: `src/features/chime/notificationEngine.test.ts`

**Approach:**
- Stop assuming delivered-notification ordering can be reconstructed from a precomputed `scheduledFor` occurrence timestamp carried in request content.
- Retain the existing “keep the newest visible representative” behavior from `docs/plans/2026-04-17-002-fix-grouped-notification-cleanup-plan.md`, but drive ordering from delivery-time data exposed by Expo plus logical slot metadata.
- Broaden the notification adapter/model as needed so cleanup helpers can inspect the delivered notification `date` and any relevant trigger metadata instead of reducing records to identifier/content only.
- Preserve a global cleanup contract: the newest visible Hour Beeper notification survives, and older owned notifications are dismissed regardless of which logical slot produced them.
- Keep cleanup best-effort and failure-tolerant: if a repeated request’s delivery artifacts are not individually dismissible on-device, contain that complexity within notification-engine helpers and prefer the safest collapse strategy over brittle precision.

**Execution note:** Add characterization coverage for repeated-delivery cleanup before removing the current occurrence-centric helpers.

**Patterns to follow:**
- `docs/plans/2026-04-17-002-fix-grouped-notification-cleanup-plan.md`
- `src/features/chime/notificationEngine.ts` — existing cleanup helpers and runtime bootstrap pattern
- `src/app/_layout.tsx` — unchanged one-time runtime entry point

**Test scenarios:**
- Happy path — app-active cleanup keeps the newest Hour Beeper notification visible and dismisses older owned notifications.
- Happy path — receipt-time cleanup continues ignoring foreign notifications and does not dismiss the just-received current item accidentally.
- Edge case — multiple delivered notifications from different logical slots still collapse to one newest global Hour Beeper representative rather than one-per-slot.
- Edge case — multiple delivered notifications from the same logical slot are ordered safely using delivery-time data.
- Edge case — malformed or missing slot metadata falls back safely without dismissing unrelated notifications.
- Error path — presented-notification inspection or dismissal failures are contained as warnings and do not break runtime bootstrap or later reconciliation.
- Integration — repeated runtime bootstrap calls remain idempotent and do not register duplicate listener sets.

**Verification:**
- Cleanup logic no longer assumes occurrence-specific identifiers or static future timestamps.
- Notification mode still behaves like a grouped/latest best-effort stack rather than an unbounded clutter stream.

- [x] **Unit 4: Keep diagnostics and dogfooding evidence understandable after the repeater shift**

**Goal:** Ensure a dogfooder can tell from in-app diagnostics that notification mode is using repeaters and interpret the smaller pending-request counts correctly.

**Requirements:** R24, R15

**Dependencies:** Unit 2

**Files:**
- Modify: `src/features/chime/diagnostics.ts`
- Modify: `src/hooks/useChimeReconciliation.ts`
- Modify: `src/components/settings/DiagnosticsSection.tsx`
- Modify: `README.md`
- Test: `src/features/chime/diagnostics.test.ts`

**Approach:**
- Keep the current diagnostics shape lightweight, but make sure reconciliation history and the diagnostics surface no longer imply that “24 scheduled artifacts” is the normal success state for an hourly schedule.
- Update any status strings, labels, or explanatory copy needed so a repeater count of `1` for hourly, `2` for every-30-minutes, or `12` for every-2-hours reads as expected rather than suspicious.
- Make the first post-upgrade migration visible enough that a dogfooder can tell whether the old one-off batch was replaced successfully, even if that visibility is only via a clearer status label.
- Align README dogfooding guidance with the new scheduling posture so future debugging conversations use the same mental model as the code.
- Keep richer trigger-dump and pending-identifier inspection work explicitly out of scope for this pass.

**Patterns to follow:**
- `src/features/chime/diagnostics.ts` and `src/features/chime/diagnostics.test.ts`
- `src/components/settings/DiagnosticsSection.tsx`
- `README.md` evaluation framing

**Test scenarios:**
- Happy path — recording a successful hourly reconciliation stores a repeater count of `1` that remains meaningful in diagnostics history.
- Happy path — recording an `every-30-minutes` reconciliation stores a repeater count of `2` and the diagnostics copy still reads as healthy.
- Edge case — the first migration reconciliation records a useful status/count instead of an opaque artifact number that looks like a regression.
- Error path — reconciliation failures still surface as errors without corrupting diagnostics history.

**Verification:**
- A dogfooder can inspect diagnostics and understand that notification mode is now slot/repeater-based.
- README and in-app diagnostics describe the same scheduling mental model.
- Upgrade-day diagnostics make it obvious whether old one-off batches were replaced.

## System-Wide Impact

- **Interaction graph:** `src/components/settings/ScheduleSection.tsx` and persisted atoms continue to express user intent; `src/hooks/useChimeReconciliation.ts` observes settings changes and records diagnostics; `src/features/chime/scheduler.ts` still delegates by delivery mode; `src/features/chime/notificationEngine.ts` now materializes repeaters instead of dated batches while preserving the cleanup/runtime boundary; Expo Notifications remains the OS-facing adapter.
- **Error propagation:** Permission failures, schedule mismatches, and cleanup/dismissal failures should remain local to reconciliation/runtime diagnostics and must not block app startup or settings rendering. Partial reschedule failures are the notable exception: they can reduce delivery coverage until the next reconciliation retry, so they must be observable in diagnostics instead of failing silently.
- **State lifecycle risks:** The main lifecycle hazards are leaving old one-offs alongside new repeaters after update, pinning repeaters to a stale timezone, mis-ordering delivered notifications once identifiers stop encoding occurrences, and making diagnostics look broken because request counts drop sharply.
- **API surface parity:** AlarmKit and notification mode should still consume the same stored `ChimeSettings` model even if their OS-level materialization differs. `src/features/chime/types.ts` and `src/features/chime/schedule.ts` remain the shared contract; this plan should not fork notification-only schedule semantics.
- **Integration coverage:** Physical-device verification should explicitly cover upgrade from an old build with pending one-offs, app relaunch, permission-denied recovery, switching delivery modes, timezone/DST/manual clock changes, reboot, and terminated-app delivery under the new repeater model.
- **Unchanged invariants:** The app remains local-only, keeps the existing notification runtime bootstrap entry point, does not add a background top-up service, and does not change the schedule-selection UI model in this pass.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Stable repeater identifiers may make delivered notifications harder to dismiss precisely than occurrence-specific identifiers did. | Keep cleanup logic encapsulated inside `src/features/chime/notificationEngine.ts`, preserve delivery-time metadata, and validate dismissal semantics on-device before tightening assumptions. |
| Calendar trigger behavior around DST, timezone travel, reboot, or manual clock changes may not exactly match the intended wall-clock contract. | Use repeating calendar triggers without a pinned timezone, keep the local-time requirement explicit in tests/docs, and verify the long-run matrix on physical devices. |
| The first app launch after shipping repeaters could leave old dated requests pending if the fingerprint comparison is too weak. | Make reconciliation trigger-aware and keep the existing “cancel all app-owned pending requests on mismatch” migration posture. |
| A partial reschedule failure after old requests are canceled could leave only part of the desired repeater set pending. | Surface scheduling failures in diagnostics, keep the retry path deterministic on the next reconciliation, and include a targeted failure test in the notification engine suite. |
| Diagnostics may look like a regression when hourly goes from `24` pending requests to `1` repeating request. | Update diagnostics wording/history semantics in the same pass so smaller counts are clearly correct, not suspicious. |
| The existing `every-minute` preset uses an interval repeater that is useful for testing but not wall-clock aligned. | Keep its semantics explicit in the plan/docs and leave product-exposure decisions to the separate debug-visibility TODO cluster. |

## Documentation / Operational Notes

- This plan still requires physical-device validation; simulator-only checks are insufficient for notification delivery timing, repeated-delivery cleanup, upgrade migration behavior, reboot behavior, and timezone/DST realignment.
- The first implementation pass should include one explicit upgrade check: start from a build that still has pending dated one-offs, install the repeater build, reconcile once, and confirm only the repeater plan remains.
- The long-run validation matrix already listed in `TODO.md` remains the right rollout/verification checklist once implementation begins.
- Do not use the `every-minute` interval path as evidence that top-of-hour wall-clock accuracy is solved; it is a scheduling-harness path, not the production correctness signal.
- If the repeater strategy behaves well on-device, capture the final behavior and any iOS caveats in a later `docs/solutions/` note so the repo stops rediscovering the same notification constraints.

## Sources & References

- **Origin document:** `docs/brainstorms/2026-04-16-hourly-chime-app-requirements.md`
- Supporting TODO: `TODO.md`
- Related plan: `docs/plans/2026-04-17-002-fix-grouped-notification-cleanup-plan.md`
- Related review note: `plan-review-output.md`
- Related code: `src/features/chime/notificationEngine.ts`
- Related code: `src/features/chime/alarmkitEngine.ts`
- Related code: `src/hooks/useChimeReconciliation.ts`
- External docs: https://docs.expo.dev/versions/latest/sdk/notifications/
- External docs: https://github.com/expo/expo/blob/5cbac55c/packages/expo-notifications/src/Notifications.types.ts
- External docs: https://developer.apple.com/documentation/usernotifications/uncalendarnotificationtrigger
