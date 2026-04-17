---
title: fix: Add best-effort post-fire notification cleanup
type: fix
status: active
date: 2026-04-17
origin: docs/brainstorms/2026-04-16-hourly-chime-app-requirements.md
---

# fix: Add best-effort post-fire notification cleanup

## Overview

Add a focused notification-mode improvement that tries to remove Hour Beeper notifications after they fire, reducing Notification Center clutter without changing the shared schedule model or the AlarmKit path.

The implementation should stay honest about platform limits: this is a **best-effort cleanup layer**, not a correctness mechanism. Immediate removal is only possible when the app process is alive enough to observe or later inspect delivered notifications.

## Problem Frame

The origin requirements document makes notification-mode clutter a first-class product concern. The current implementation already does the low-risk half of the job: it suppresses banner/list presentation while the app is foregrounded and cancels **pending** notification artifacts during reconciliation. It does **not** currently attempt to remove **delivered** notifications after they fire.

That gap matters because notification mode is being dogfooded specifically to compare subtlety and Notification Center side effects against AlarmKit (see origin: `docs/brainstorms/2026-04-16-hourly-chime-app-requirements.md`). A focused follow-up should try the strongest cleanup behavior the current Expo/UserNotifications stack supports while preserving delivery reliability and avoiding false claims about invisibility.

## Requirements Trace

- **R12** — notification mode should pursue the lowest-clutter behavior available, including best-effort cleanup where platform rules allow.
- **R15** — the team must be able to compare delivery modes honestly, including notification-side artifacts.
- **R18-R20** — the user-visible state and permission model must remain usable while cleanup behavior is added.
- **R24** — V1 dogfooding should produce evidence about notification clutter and tradeoffs.

## Scope Boundaries

- No AlarmKit behavior changes
- No shared schedule-model redesign or rolling scheduling-window work
- No native module work outside the existing Expo notifications surface
- No promise that notification mode becomes invisible when the app is terminated
- No analytics subsystem or heavy telemetry solely for cleanup behavior

### Deferred to Separate Tasks

- Broader notification scheduling strategy changes such as rolling replenishment windows
- Post-dogfooding product decisions about whether notification mode remains viable as a long-term default
- Any native fallback if Expo's delivered-notification APIs prove insufficient

## Context & Research

### Relevant Code and Patterns

- `src/features/chime/notificationEngine.ts` already owns notification-mode scheduling, request identifiers, app-owned metadata (`source`, `occurrenceId`, `scheduledFor`, `sound`), and foreground notification presentation rules.
- `src/features/chime/notificationEngine.ts` already has the key ownership filter in `isHourBeeperNotification`, which should remain the canonical way to distinguish app-owned notifications from everything else.
- `src/app/_layout.tsx` is the current global bootstrap point for notification runtime setup via `configureForegroundNotifications()`.
- `src/hooks/useChimeReconciliation.ts` initializes notification/alarm dependencies and reconciles scheduled artifacts, but it does not subscribe to delivery-time notification events.
- `src/features/chime/notificationEngine.test.ts` already covers request generation and schedule reconciliation with a fake `NotificationClient`; this is the most natural existing test surface to extend before adding any UI wiring.
- `README.md` and `src/components/settings/DeliveryModeSection.tsx` currently describe notification mode as possibly leaving visible artifacts, so those docs/copy should be updated only if the new runtime behavior materially changes the promise.

### Institutional Learnings

- There is no `docs/solutions/` directory in this repo yet, so the origin requirements doc and the current implementation are the main institutional context.

### External References

- Expo notifications docs for SDK 55 expose `addNotificationReceivedListener`, `getPresentedNotificationsAsync`, `dismissNotificationAsync`, and `dismissAllNotificationsAsync`, and document dismissal as operating on Notification Center/tray items.
- Expo's bundled API docs state that `dismissNotificationAsync` accepts the notification identifier obtained from `setNotificationHandler` or `addNotificationReceivedListener`.
- Apple `UNUserNotificationCenter.removeDeliveredNotifications(withIdentifiers:)` confirms selective delivered-notification removal is supported asynchronously by identifier.
- Apple and Expo documentation do **not** make delivered-notification removal a safe correctness mechanism for a terminated app, so the plan should preserve the current product caveat.

## Key Technical Decisions

- **Treat post-fire cleanup as additive runtime hygiene, not scheduling correctness.** Existing reconciliation remains responsible for pending requests; delivered-artifact cleanup should not become a prerequisite for reliable chime delivery.
- **Dismiss only app-owned notifications, and prefer exact identifiers over blanket clearing.** Reuse the existing ownership metadata/prefix checks so the app never dismisses unrelated notifications.
- **Wire cleanup at the app-runtime bootstrap layer.** Notification receipt and presented-notification inspection are global concerns, so the registration point should stay near `src/app/_layout.tsx` rather than a screen-level component.
- **Support both immediate and catch-up cleanup paths.** Try to dismiss matching notifications as they are received when the app process is running, and also dismiss already-presented matching notifications on launch / foreground activation to catch artifacts delivered while the app was inactive.
- **Keep user-facing language honest.** If copy changes, it should say the app now attempts cleanup best-effort while running or after resume, not that clutter is solved universally.

## Open Questions

### Resolved During Planning

- **Should this change live in the notification path only?** Yes — AlarmKit is out of scope for this focused plan.
- **Should cleanup dismiss all notifications or only Hour Beeper's own?** Only Hour Beeper-owned notifications, identified by existing metadata/prefix logic.
- **Should delivered cleanup replace schedule reconciliation?** No — reconciliation continues to manage pending artifacts, while delivered cleanup is a separate runtime concern.
- **Should the plan include a catch-up path, not just immediate receipt-time dismissal?** Yes — otherwise the feature would miss the app states where clutter is most likely to occur.

### Deferred to Implementation

- **Whether a tiny delay/retry is needed before exact-id dismissal succeeds on iOS.** This depends on real device behavior and should be settled during execution, not guessed here.
- **Whether app-activation cleanup needs debouncing or a narrow throttle.** This depends on how often the app re-enters foreground during dogfooding and whether repeated inspections prove noisy.
- **How much of the new behavior is observable while the app is backgrounded but still alive.** This is an execution-time device-validation question.

## Implementation Units

- [ ] **Unit 1: Extend the notification engine with delivered-artifact cleanup primitives**

**Goal:** Add notification-engine capabilities to inspect and selectively dismiss delivered Hour Beeper notifications without changing the existing schedule reconciliation contract.

**Requirements:** R12, R15

**Dependencies:** None

**Files:**
- Modify: `src/features/chime/notificationEngine.ts`
- Test: `src/features/chime/notificationEngine.test.ts`

**Approach:**
- Extend the notification boundary to cover delivered-notification inspection and dismissal in addition to scheduled-request management.
- Reuse `isHourBeeperNotification` as the canonical ownership filter for both scheduled and presented notification artifacts.
- Add narrowly scoped helpers for:
  - dismissing a single delivered app-owned notification by identifier
  - enumerating presented notifications and dismissing only the ones owned by Hour Beeper
- Keep these helpers tolerant of platform/API failures so they can support best-effort cleanup without destabilizing app startup or chime delivery.
- Preserve the current scheduling APIs and return shapes so the scheduler path remains focused on pending notifications.

**Execution note:** Start with failing unit tests for owned-vs-foreign delivered notification filtering and targeted dismissal before wiring runtime listeners.

**Patterns to follow:**
- `src/features/chime/notificationEngine.ts`
- `src/features/chime/notificationEngine.test.ts`
- existing ownership helpers inside `src/features/chime/notificationEngine.ts`

**Test scenarios:**
- Happy path — a delivered Hour Beeper notification identified by request identifier is dismissed by exact identifier.
- Happy path — a presented-notification sweep dismisses multiple Hour Beeper notifications and leaves unrelated notifications untouched.
- Edge case — a notification without Hour Beeper metadata or prefix is ignored during cleanup.
- Edge case — Hour Beeper ownership still works when matching comes from `data.source` instead of the identifier prefix alone.
- Error path — a dismissal failure is surfaced as a best-effort warning/result and does not throw through the scheduling path.
- Error path — presented-notification inspection failure does not prevent the app from continuing to reconcile scheduled notifications later.

**Verification:**
- The notification engine exposes explicit delivered-notification cleanup helpers.
- Tests prove that cleanup is selective, app-owned-only, and failure-tolerant.

- [ ] **Unit 2: Register immediate and catch-up cleanup at app runtime bootstrap**

**Goal:** Invoke the cleanup primitives at the app lifecycle points where delivered notifications can realistically be removed.

**Requirements:** R12, R15, R18-R20

**Dependencies:** Unit 1

**Files:**
- Modify: `src/app/_layout.tsx`
- Modify: `src/features/chime/notificationEngine.ts`
- Test: `src/features/chime/notificationEngine.test.ts`

**Approach:**
- Evolve the current `configureForegroundNotifications()` bootstrap into a runtime setup that still configures foreground presentation but also registers cleanup behavior once.
- At minimum, the runtime setup should:
  - preserve the current foreground sound-only behavior (`shouldShowBanner: false`, `shouldShowList: false`, `shouldPlaySound: true`)
  - subscribe to notification-received events and attempt to dismiss matching Hour Beeper notifications by identifier when available
  - perform a startup / foreground-activation sweep of presented notifications and dismiss any Hour Beeper artifacts already sitting in Notification Center
- Keep listener registration idempotent so repeated renders or remounts do not stack duplicate subscriptions.
- Return or encapsulate cleanup/unsubscribe behavior cleanly enough that `src/app/_layout.tsx` remains a thin bootstrapper rather than a logic-heavy runtime manager.
- Continue to avoid touching AlarmKit or foreign notifications.

**Patterns to follow:**
- `src/app/_layout.tsx`
- `src/features/chime/notificationEngine.ts`
- `src/hooks/useChimeReconciliation.ts` for global startup-side-effect placement patterns

**Test scenarios:**
- Happy path — runtime bootstrap registers one notification-received listener and dismisses a matching Hour Beeper notification when the callback fires.
- Happy path — app-start or app-activation catch-up cleanup dismisses already-presented Hour Beeper notifications.
- Edge case — calling the runtime bootstrap more than once does not create duplicate listeners or duplicate dismiss attempts.
- Edge case — a foreign notification received through the listener is ignored.
- Error path — listener or presented-notification cleanup failures are logged/contained and do not crash root layout initialization.
- Integration — root layout still initializes notification behavior once on mount and preserves the existing screen tree and foreground presentation rules.

**Verification:**
- The root layout still bootstraps notifications once.
- Cleanup attempts happen via shared engine helpers rather than ad hoc UI code.
- Foreground notification sound behavior remains unchanged.

- [ ] **Unit 3: Update docs and evaluation copy to match the new cleanup posture**

**Goal:** Make the app's written promise reflect the new best-effort cleanup behavior without overstating platform guarantees.

**Requirements:** R11, R12, R24

**Dependencies:** Unit 2

**Files:**
- Modify: `README.md`
- Modify: `src/components/settings/DeliveryModeSection.tsx`

**Approach:**
- Update documentation and in-product explanatory copy only after the runtime behavior is defined clearly enough to describe accurately.
- Keep the message concise: notification mode now attempts to clean up delivered artifacts when the app can observe them, but terminated-app delivery may still leave visible artifacts.
- Preserve the product comparison framing so dogfooding still evaluates clutter honestly rather than implying the problem is solved.

**Patterns to follow:**
- `README.md`
- `src/components/settings/DeliveryModeSection.tsx`

**Test scenarios:**
- Test expectation: none — documentation and copy updates only.

**Verification:**
- README and settings copy describe notification-mode tradeoffs consistently.
- The updated wording matches the actual runtime behavior and keeps the dogfooding comparison honest.

## System-Wide Impact

- **Interaction graph:** `src/app/_layout.tsx` bootstraps notification runtime behavior; `src/features/chime/notificationEngine.ts` owns both scheduling and delivered-artifact cleanup; Expo notifications APIs mediate presentation, receipt, and dismissal; `src/hooks/useChimeReconciliation.ts` remains responsible for scheduled-artifact reconciliation.
- **Error propagation:** Delivered-notification cleanup failures should be logged or surfaced as best-effort failures locally, not allowed to break app startup, permission checks, or schedule reconciliation.
- **State lifecycle risks:** Duplicate listener registration, dismiss-before-present races, and repeated foreground sweeps are the main lifecycle hazards.
- **API surface parity:** Notification mode gains cleanup behavior, but AlarmKit and persisted schedule state remain unchanged.
- **Integration coverage:** Physical-device validation should cover foreground, background, and terminated delivery states; notification-mode sound playback; launch/resume cleanup; and the absence of accidental dismissal of unrelated notifications.
- **Unchanged invariants:** `ChimeSettings`, persistence, permission request flow, schedule materialization, and AlarmKit engine behavior do not change in this plan.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Expo listener callbacks may not run in every app state where a local notification fires. | Treat immediate dismissal as best-effort and pair it with startup / foreground catch-up cleanup. |
| Exact-id dismissal may race with OS presentation timing. | Allow implementation to add a tiny delay/retry if device testing shows a real race, but keep that detail out of the plan until proven necessary. |
| Over-broad filtering could dismiss unrelated notifications. | Reuse the existing Hour Beeper ownership checks and prefer exact identifiers over `dismissAllNotificationsAsync`. |
| Cleanup work could accidentally interfere with delivery reliability or app startup. | Keep cleanup failure-tolerant, separate from scheduling correctness, and covered by regression tests plus device verification. |

## Documentation / Operational Notes

- This change still requires real-device validation; simulator-only behavior is not enough to judge Notification Center cleanup on iOS.
- Dogfooding should explicitly compare clutter across three states: app foregrounded, app backgrounded but alive, and app terminated before the chime fires.
- If best-effort cleanup materially improves clutter, consider recording that outcome in a later `docs/solutions/` entry once execution is complete.

## Sources & References

- **Origin document:** `docs/brainstorms/2026-04-16-hourly-chime-app-requirements.md`
- Related code: `src/features/chime/notificationEngine.ts`
- Related code: `src/app/_layout.tsx`
- Related code: `src/hooks/useChimeReconciliation.ts`
- External docs: https://docs.expo.dev/versions/v55.0.0/sdk/notifications/
- External docs: https://developer.apple.com/documentation/usernotifications/unusernotificationcenter/removedeliverednotifications(withidentifiers:)
