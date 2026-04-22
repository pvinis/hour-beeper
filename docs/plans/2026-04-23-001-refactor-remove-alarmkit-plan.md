---
title: refactor: Remove AlarmKit and converge on notification-only chimes
type: refactor
status: completed
date: 2026-04-23
origin: docs/brainstorms/2026-04-16-hourly-chime-app-requirements.md
---

# refactor: Remove AlarmKit and converge on notification-only chimes

## Overview

Retire AlarmKit from Hour Beeper and converge the app onto a single notification-based delivery path. This follow-up refactor removes the delivery-mode abstraction, AlarmKit-specific UI and diagnostics, the local native Expo module, and AlarmKit-specific iOS configuration while preserving the existing notification scheduler, bundled sounds, local-time schedule model, persistence, and lightweight diagnostics.

This plan assumes two explicit product decisions from 2026-04-23:

- AlarmKit is no longer part of the product.
- A transitional cleanup build is **not** required; clean installs or manual reset are acceptable for prior dogfood builds.

## Problem Frame

The origin requirements and first implementation plan intentionally shipped a dual-mode V1 so the team could compare notification delivery against AlarmKit on real devices. That work is now complete: the repository contains both delivery engines, a shared schedule model, a visible delivery-mode switch, AlarmKit-specific permission and diagnostics state, and a repo-owned native module.

The product decision has changed. Hour Beeper will no longer use AlarmKit, so the current repository shape is carrying dead complexity in three places:

1. **Shared contracts** still model two delivery modes even though only notification delivery will remain.
2. **Runtime/UI seams** still initialize, display, and explain AlarmKit-specific state.
3. **Native/config surfaces** still bundle an AlarmKit bridge and advertise AlarmKit usage to iOS.

The refactor should simplify the app to its real product shape without regressing what already works in notification mode. Historical planning artifacts can remain as historical records, but current product code and documentation should stop referencing AlarmKit.

## Requirements Trace

- **R1-R7** — preserve the schedule model, bundled sounds, and local-time behavior.
- **R12** — keep notification delivery as the lowest-clutter viable path, including the existing grouping and cleanup posture.
- **R16, R18-R21** — preserve the native-feeling settings surface, permission guidance, and local persistence after removing mode selection.
- **R22-R24** — keep jotai + expo-sqlite persistence and lightweight diagnostics, but reframe them around notification delivery only.
- **Follow-up decision (2026-04-23)** — retire AlarmKit entirely, accept clean installs/manual reset instead of a transitional cleanup build, and leave historical planning docs unchanged.

## Scope Boundaries

- No replacement delivery engine or placeholder abstraction for future modes.
- No transitional build to cancel previously scheduled AlarmKit alarms on older dogfood installs.
- No rewrite of historical planning documents under `docs/brainstorms/` or older `docs/plans/` files.
- No cleanup of historical review/context artifacts such as `plan-review-output.md` or `review-output.md`; only current product-facing docs are in scope.
- No Android work, iCloud sync work, or broader product redesign.

### Deferred to Separate Tasks

- Any future platform-specific delivery work, if the product later expands beyond notification-only iOS behavior.
- Any explicit cleanup of old dogfood devices beyond the manual reset/uninstall guidance documented for contributors.

## Context & Research

### Relevant Code and Patterns

- `src/features/chime/schedule.ts` is the persisted-settings migration choke point via `sanitizeChimeSettings(...)`.
- `src/features/chime/diagnostics.ts` owns diagnostics schema normalization and is the safest place to drop AlarmKit-only history/fields during migration.
- `src/features/chime/notificationEngine.ts` and `src/app/_layout.tsx` are the notification-only runtime core that must remain intact.
- `src/hooks/useChimeReconciliation.ts`, `src/screens/HomeScreen.tsx`, `src/components/settings/PermissionBanner.tsx`, `src/components/settings/permissionBannerModel.ts`, and `src/components/settings/DiagnosticsSection.tsx` are the app-level seams that still expose dual-mode behavior.
- `app.config.ts`, `ios/HourBeeperDev/Info.plist`, and `ios/Podfile.lock` still carry AlarmKit-specific native/config state.
- `modules/expo-hour-chime-alarmkit/` and `src/features/chime/alarmkitEngine.ts` are the complete dead-code/native-module removal target once app contracts are collapsed.
- `docs/plans/2026-04-17-001-fix-post-fire-notification-cleanup-plan.md` and `docs/plans/2026-04-17-002-fix-grouped-notification-cleanup-plan.md` show the current notification-only behavior and copy posture the refactor should preserve.

### Institutional Learnings

- There is no `docs/solutions/` directory in this repo, so local grounding comes from the existing dual-mode implementation, the follow-up notification cleanup plans, and the origin requirements document.
- `plan-review-output.md` already identified AlarmKit-specific risk and contract fragility, which reinforces simplifying shared seams rather than leaving a dormant second path in place.

### External References

- None. Local repo patterns are strong enough for this internal convergence refactor, so no external research is needed.

## Key Technical Decisions

- **Remove `deliveryMode` from the shared settings model instead of keeping a single-value abstraction.** Leaving a dormant mode layer would preserve complexity without serving an active product need.
- **Normalize legacy persisted dual-mode data at the sanitization boundary.** Old `deliveryMode: "alarmkit"` settings should load as notification-backed settings with the same schedule, sound, and enabled state.
- **Drop AlarmKit-specific diagnostics data rather than relabeling it.** Incompatible history should be filtered out so the app does not present stale comparison data as current notification state.
- **Delete the AlarmKit bridge and iOS usage strings directly.** Because the user accepted clean installs/manual reset, the refactor does not need a temporary compatibility bridge to cancel existing alarms.
- **Keep historical docs unchanged.** This new plan supersedes the current product direction; it does not rewrite historical brainstorming or old implementation plans.

## Open Questions

### Resolved During Planning

- **Should the refactor preserve already-installed AlarmKit dogfood builds with a cleanup bridge?** No — clean installs/manual reset are acceptable.
- **Should historical planning docs be scrubbed too?** No — keep them as historical records and update only current product/code/docs.
- **Should `deliveryMode` remain in `ChimeSettings` as a hidden constant?** No — remove it completely from the app contract.
- **How should legacy diagnostics be handled?** Filter out AlarmKit-specific fields/history instead of rewriting them as notification events.

### Deferred to Implementation

- **How should generated iOS files be refreshed?** Whether `ios/HourBeeperDev/Info.plist` and `ios/Podfile.lock` are updated through a fresh generator/prebuild pass or equivalent targeted native refresh is implementation-time workflow detail; the important constraint is that the resulting diff only reflects AlarmKit removal.

## Implementation Units

- [x] **Unit 1: Collapse persisted contracts to notification-only**

**Goal:** Remove dual-mode concepts from the shared settings, scheduler, notification-engine, and diagnostics contracts while safely migrating stored data from prior builds.

**Requirements:** R1-R7, R12, R18-R24, follow-up decision (2026-04-23)

**Dependencies:** None

**Files:**
- Modify: `src/features/chime/types.ts`, `src/features/chime/schedule.ts`, `src/features/chime/scheduler.ts`, `src/features/chime/notificationEngine.ts`, `src/features/chime/diagnostics.ts`, `src/features/chime/atoms.ts`, `src/storage/persist.ts`
- Test: `src/features/chime/schedule.test.ts`, `src/features/chime/notificationEngine.test.ts`, `src/features/chime/diagnostics.test.ts`

**Approach:**
- Remove `DeliveryMode`, `deliveryMode`, and `alarmkit` permission fields from the shared TypeScript/domain model.
- Make the scheduler and notification engine operate from notification delivery as the only supported path instead of branching on mode.
- Treat `sanitizeChimeSettings(...)` as the authoritative migration boundary: legacy settings with `deliveryMode: "alarmkit"` should become notification-only settings without losing schedule/sound intent.
- Simplify diagnostics state to notification-only fields and drop incompatible historical entries rather than preserving stale cross-mode comparison data.

**Execution note:** Add characterization coverage for legacy persisted shapes before changing the sanitizer logic so migration behavior is locked down explicitly.

**Patterns to follow:**
- `src/features/chime/schedule.ts`
- `src/features/chime/diagnostics.ts`
- `docs/plans/2026-04-17-001-fix-post-fire-notification-cleanup-plan.md`
- `docs/plans/2026-04-17-002-fix-grouped-notification-cleanup-plan.md`

**Test scenarios:**
- Happy path — a legacy persisted notification-mode settings record rehydrates with the same enabled state, schedule, and sound after the mode field is removed.
- Happy path — a legacy persisted AlarmKit-mode settings record is normalized to notification-only while preserving enabled state, schedule, and sound.
- Edge case — malformed or unknown legacy `deliveryMode` values fall back to safe notification defaults without crashing.
- Edge case — legacy diagnostics that include `alarmkitPermission`, `activeMode: "alarmkit"`, AlarmKit-mode history entries, or unknown/invalid history mode values sanitize into a valid notification-only diagnostics state.
- Error path — corrupted persisted settings/diagnostics objects still fall back to defaults rather than throwing during app startup.
- Integration — rehydrated settings still materialize the same upcoming occurrences and notification reconciliation still schedules artifacts when chimes are enabled.

**Verification:**
- Dual-mode persisted data from older builds can load into the app without runtime errors, and no shared app contract still requires a delivery-mode branch.

- [x] **Unit 2: Simplify reconciliation and settings UI to a single notification path**

**Goal:** Remove all AlarmKit-specific UI, copy, and runtime initialization while keeping the settings experience complete and native-feeling.

**Requirements:** R12, R16, R18-R21, follow-up decision (2026-04-23)

**Dependencies:** Unit 1

**Files:**
- Modify: `src/hooks/useChimeReconciliation.ts`, `src/screens/HomeScreen.tsx`, `src/components/settings/PermissionBanner.tsx`, `src/components/settings/permissionBannerModel.ts`, `src/components/settings/DiagnosticsSection.tsx`
- Delete: `src/components/settings/DeliveryModeSection.tsx`
- Test: `src/components/settings/PermissionBanner.test.ts`, `src/features/chime/diagnostics.test.ts`

**Approach:**
- Initialize only the notification client in `useChimeReconciliation.ts` and record only notification-side reconciliation/permission state.
- Remove the delivery-mode section from the settings flow and simplify status-summary copy so it describes schedule/sound/sync state only.
- Collapse the permission banner model to notification-only language and remove unavailable-state handling that existed solely for unsupported AlarmKit devices.
- Simplify diagnostics UI so it reports notification permission, scheduled artifact count, last reconciliation, and version/build metadata without mode-comparison framing.
- Keep automated coverage at the existing model/pure-function level rather than introducing a brand-new React Native component-test harness as part of this refactor.

**Patterns to follow:**
- `src/features/chime/notificationEngine.ts`
- `src/app/_layout.tsx`
- `docs/plans/2026-04-17-002-fix-grouped-notification-cleanup-plan.md`

**Test scenarios:**
- Happy path — enabling chimes from the main screen requests notification permissions and keeps schedule/sound configuration available.
- Happy path — when notification permission is granted, the permission banner stays hidden and the diagnostics section shows notification-specific reconciliation data only.
- Edge case — a user migrating from stored dual-mode data sees a valid settings screen with no blank state, stale mode label, or missing summary copy.
- Error path — denied notification permission shows notification-only remediation copy and never references AlarmKit or iOS-version gating.
- Integration — changing schedule or sound triggers one reconciliation path and never attempts to import or initialize AlarmKit at runtime.

**Verification:**
- A user can fully configure Hour Beeper without seeing any AlarmKit labels, mode switches, or AlarmKit-specific diagnostics.

- [x] **Unit 3: Delete the AlarmKit implementation and native config**

**Goal:** Remove the dead AlarmKit delivery engine, local Expo module, and iOS/native configuration now that the app contract no longer references them.

**Requirements:** follow-up decision (2026-04-23)

**Dependencies:** Unit 1, Unit 2

**Files:**
- Delete: `src/features/chime/alarmkitEngine.ts`, `src/features/chime/alarmkitEngine.test.ts`, `modules/expo-hour-chime-alarmkit/index.ts`, `modules/expo-hour-chime-alarmkit/package.json`, `modules/expo-hour-chime-alarmkit/expo-module.config.json`, `modules/expo-hour-chime-alarmkit/README.md`, `modules/expo-hour-chime-alarmkit/ios/ExpoHourChimeAlarmKitModule.swift`, `modules/expo-hour-chime-alarmkit/ios/expo-hour-chime-alarmkit.podspec`
- Modify: `app.config.ts`

**Approach:**
- Delete the JS/TS AlarmKit engine and the repo-owned local Expo module once no app code imports it.
- Remove AlarmKit from source-owned Expo configuration while leaving generated `ios/` artifacts untouched; future regeneration should naturally reflect the source-config change.
- Keep the notification sound/plugin configuration intact; the removal should be strictly about AlarmKit, not a wider native-config rewrite.
- Do not hand-edit generated native outputs for this repo.

**Patterns to follow:**
- `plugins/withNotificationSoundsOnly.ts`
- `plugins/withLocalNotificationsOnly.ts`
- `app.config.ts`

**Test scenarios:**
- Test expectation: none -- this unit is dead-code/native-config removal after notification behavior and migration coverage are already validated in Units 1 and 2.

**Verification:**
- The repo no longer ships an AlarmKit engine, AlarmKit native module, or AlarmKit usage strings/config in current build artifacts, and the current app code no longer imports or references AlarmKit outside preserved historical documents.

- [x] **Unit 4: Refresh current product documentation and contributor guidance**

**Goal:** Update current repo-facing docs so AlarmKit is no longer described as a product capability while preserving historical docs as historical records.

**Requirements:** R12, R18, R24, follow-up decision (2026-04-23)

**Dependencies:** Unit 2, Unit 3

**Files:**
- Modify: `README.md`

**Approach:**
- Rewrite the current product description around notification delivery only.
- Remove the delivery-mode comparison rubric and any claim that AlarmKit is part of the active product surface.
- Keep the physical-device testing guidance, but narrow it to notification delivery, custom sounds, and reboot/relaunch alignment.
- Add concise contributor guidance that older AlarmKit dogfood installs may require manual reset/uninstall because no transitional cleanup build is planned.
- Treat `README.md` as the current product-facing doc to update in this pass; leave older plans, brainstorms, and review artifacts untouched so repo history remains accurate.

**Patterns to follow:**
- `README.md`
- current repo section ordering and contributor notes

**Test scenarios:**
- Test expectation: none -- this unit is documentation-only.

**Verification:**
- Current repo-facing documentation no longer presents AlarmKit as a supported capability or active evaluation path.

## System-Wide Impact

- **Interaction graph:** Settings UI writes notification-only state into persisted storage; reconciliation materializes notification artifacts from that state; diagnostics report only notification outcomes.
- **Error propagation:** Notification permission denials and scheduling failures should continue surfacing as readable app state without corrupting stored settings.
- **State lifecycle risks:** legacy dual-mode persisted data, stale AlarmKit-only diagnostics history, and orphaned old dogfood alarms on devices that are not manually reset are the main lifecycle hazards.
- **API surface parity:** `ChimeSettings`, scheduler results, diagnostics state, and UI props all lose delivery-mode and AlarmKit-specific fields together; partial cleanup will leave broken imports or inconsistent state.
- **Integration coverage:** app-start migration from older persisted records, notification-only reconciliation after migration, denied-permission copy, and native-config/module removal all need explicit verification.
- **Unchanged invariants:** schedule materialization, bundled sound selection, notification grouping/cleanup, local persistence, and the single-screen settings-first UX remain part of the product.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Older dogfood installs may still have previously scheduled AlarmKit alarms on-device | Accepted by product decision; document manual reset/uninstall guidance and do not promise automatic cleanup |
| Shared-type simplification may leave stale imports or branch assumptions behind | Collapse types/sanitizers first, then update runtime/UI seams against the new contract before deleting the native module |
| Diagnostics migration may accidentally preserve misleading cross-mode history | Filter/drop AlarmKit-only fields and history entries instead of relabeling them as notification events |
| Native/generated iOS files may drift beyond the intended cleanup | Limit native refresh to AlarmKit string/module removal and review generator-owned diffs for unrelated churn |

## Documentation / Operational Notes

- Do not edit `docs/brainstorms/2026-04-16-hourly-chime-app-requirements.md` or older plan files as part of this implementation; this follow-up plan supersedes their AlarmKit assumptions for current product work.
- Physical-device validation remains necessary for notification delivery, custom sound playback, reboot/relaunch behavior, and Notification Center cleanup behavior.
- Current contributor-facing docs should mention the manual reset/uninstall expectation for anyone who previously ran an AlarmKit dogfood build.

## Sources & References

- **Origin document:** [docs/brainstorms/2026-04-16-hourly-chime-app-requirements.md](docs/brainstorms/2026-04-16-hourly-chime-app-requirements.md)
- Historical implementation plan: [docs/plans/2026-04-16-001-feat-hourly-chime-dual-mode-plan.md](docs/plans/2026-04-16-001-feat-hourly-chime-dual-mode-plan.md)
- Related notification cleanup plans: [docs/plans/2026-04-17-001-fix-post-fire-notification-cleanup-plan.md](docs/plans/2026-04-17-001-fix-post-fire-notification-cleanup-plan.md), [docs/plans/2026-04-17-002-fix-grouped-notification-cleanup-plan.md](docs/plans/2026-04-17-002-fix-grouped-notification-cleanup-plan.md)
- Related code: `src/features/chime/schedule.ts`, `src/features/chime/notificationEngine.ts`, `src/hooks/useChimeReconciliation.ts`, `src/screens/HomeScreen.tsx`, `app.config.ts`
- Related review context: `plan-review-output.md`
