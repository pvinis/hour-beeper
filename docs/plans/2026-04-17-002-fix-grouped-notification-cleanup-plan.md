---
title: fix: Group notification mode and keep only the latest delivered chime
type: fix
status: active
date: 2026-04-17
origin: docs/brainstorms/2026-04-16-hourly-chime-app-requirements.md
---

# fix: Group notification mode and keep only the latest delivered chime

## Overview

Refine notification mode so Hour Beeper notifications behave more like a single rolling thread instead of a stream of unrelated artifacts. The plan combines three tactics:

1. add iOS grouping/threading metadata so Hour Beeper notifications stack visually
2. when notification `N` is received and the app gets runtime, dismiss notification `N-1` rather than dismissing `N` immediately
3. when the app becomes active, sweep delivered Hour Beeper notifications and keep only the newest one

This intentionally replaces the current “dismiss the current notification as soon as it is received” behavior. The new posture preserves a visible current notification when the OS allows it, while still minimizing long-lived clutter.

## Problem Frame

The origin requirements document makes notification clutter a core evaluation concern for notification mode, but it also warns that iOS may force visible surfaces even when the app only wants a subtle chime (see origin: `docs/brainstorms/2026-04-16-hourly-chime-app-requirements.md`).

The current implementation already has a best-effort cleanup layer, but it is optimized for immediate disappearance rather than for the “stack cleanly and keep only the latest representative” behavior the team now wants:

- `src/features/chime/notificationEngine.ts` tags each notification with stable ownership metadata and stable occurrence identifiers
- the runtime currently tries to dismiss the **current** Hour Beeper notification on receipt
- the app-active sweep currently dismisses **all** delivered Hour Beeper notifications

That means the current strategy fights the desired UX in two ways:

- it prevents the current chime notification from serving as the one visible representative in the stack
- it discards all delivered history on app active instead of collapsing it to the newest relevant item

This follow-up should shift notification mode from “delete aggressively” to “group consistently and collapse to latest when possible,” while preserving the requirements document’s honesty that terminated-app delivery may still leave artifacts.

## Requirements Trace

- **R12** — notification mode should pursue the lowest-clutter behavior available, including grouping and best-effort cleanup where platform rules allow.
- **R15** — the team must still be able to compare notification mode against AlarmKit using the same schedule and settings.
- **R11, R18-R20** — mode explanation and user-visible behavior should stay understandable and honest.
- **R24** — dogfooding should still yield a credible read on notification-side clutter, not a misleading claim of invisibility.

## Scope Boundaries

- No AlarmKit changes
- No push-notification architecture or server-side cleanup path
- No new persistence model or schedule-model redesign
- No attempt to guarantee that only one notification is ever visible while the app is terminated
- No Android-specific notification grouping work in this pass

### Deferred to Separate Tasks

- Rolling scheduling-window changes or other broader notification-materialization redesign
- Native-module fallback work if Expo’s grouping metadata or dismissal behavior proves insufficient on-device
- Product-level decision about whether notification mode remains acceptable as a long-term default after dogfooding

## Context & Research

### Relevant Code and Patterns

- `src/features/chime/notificationEngine.ts` is the canonical notification boundary. It already owns request generation, request identifiers, sound metadata, delivery-mode scheduling, ownership filtering, and runtime cleanup hooks.
- `src/features/chime/notificationEngine.ts` already includes the app-owned metadata needed to reason about sequence: `occurrenceId`, `scheduledFor`, `source`, and `sound`.
- `src/features/chime/notificationEngine.ts` currently dismisses the current notification on receipt via `dismissPresentedNotificationIfOwned(...)` and removes all Hour Beeper delivered notifications on app active via `dismissPresentedHourBeeperNotifications(...)`.
- `src/app/_layout.tsx` is the global runtime bootstrap point for notification behavior and is the right place to keep listener registration and category setup centralized.
- `src/features/chime/notificationEngine.test.ts` already covers request generation, selective dismissal, runtime registration, and reconciliation. It is the natural place to extend test coverage for grouping metadata, previous-notification dismissal, and “keep latest on active” behavior.
- `README.md` and `src/components/settings/DeliveryModeSection.tsx` already describe notification mode as best-effort cleanup; both should be updated if the cleanup posture changes from “remove current” to “keep the latest grouped representative.”

### Institutional Learnings

- There is still no `docs/solutions/` directory in this repo, so the strongest local grounding comes from the requirements doc plus the existing notification-engine code and tests.

### External References

- Expo SDK 55 notification types expose iOS notification-content fields including `threadIdentifier`, `summaryArgument`, `summaryArgumentCount`, `categoryIdentifier`, and `interruptionLevel`, so grouping metadata can be set from the existing JS scheduling path.
- Expo SDK 55 also exposes `setNotificationCategoryAsync`, whose iOS category options include `categorySummaryFormat`, giving the app a way to shape grouped notification summaries.
- Apple notification-content docs define `threadIdentifier` and summary fields as the mechanism for grouping related notifications in Notification Center.
- Apple delivered-notification removal remains app-executed and asynchronous, so previous-item dismissal and app-active sweeping are still best-effort runtime behavior rather than correctness guarantees.

## Key Technical Decisions

- **Switch from “dismiss current” to “keep current, dismiss previous when possible.”** The newest delivered notification should become the single visible representative when cleanup succeeds.
- **Use explicit Hour Beeper grouping metadata on every scheduled notification.** Grouping should not depend on identifier similarity alone; add stable thread/category metadata so iOS has a consistent basis for stacking.
- **Keep one newest delivered Hour Beeper notification on app active.** The sweep should collapse stale clutter, not wipe out the current representative.
- **Derive sequencing from app-owned notification data rather than from Notification Center order alone.** Existing `scheduledFor` / `occurrenceId` metadata is a better source of truth for “previous vs current” than UI ordering.
- **Preserve honest product copy.** Notification mode should be described as grouped and best-effort collapsed to the latest notification when the app can act, not as fully hidden.

## Open Questions

### Resolved During Planning

- **Should grouping and cleanup both ship in the same focused change?** Yes — they reinforce each other and together define the desired behavior.
- **On app active, should the sweep remove all Hour Beeper notifications or keep one?** Keep the newest one and dismiss the rest.
- **When notification `N` is received, should cleanup target `N` or `N-1`?** Target `N-1`, so the current chime can remain as the newest representative.
- **Should this behavior live in the existing notification engine/runtime boundary?** Yes — the current code already centralizes scheduling, ownership filtering, and runtime cleanup there.

### Deferred to Implementation

- **The final category identifier and summary copy.** The implementation should choose concise system-facing strings after seeing how grouped summaries render on-device.
- **Whether app-active sweeping should keep the newest item by `scheduledFor`, presentation date, or both.** The existing metadata suggests `scheduledFor` as the primary key, but device behavior may justify a small tie-break rule.
- **Whether listener-time dismissal needs a tiny delay/retry before removing `N-1`.** This depends on real-device timing and should be validated during execution rather than guessed here.

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

| Runtime moment | Desired delivered-notification result |
|---|---|
| Schedule generation | Every Hour Beeper notification carries the same grouping/thread identity plus per-occurrence metadata |
| Notification `N` is delivered while the app gets runtime | Keep `N`; attempt to dismiss `N-1` if it is still presented |
| App becomes active with multiple Hour Beeper notifications visible | Keep the newest delivered Hour Beeper item; dismiss all older Hour Beeper items |
| App terminated when notifications fire | Grouping metadata still helps Notification Center stack visually, but collapse-to-latest remains best-effort only |

## Implementation Units

- [ ] **Unit 1: Add grouping/threading metadata to Hour Beeper notification content**

**Goal:** Make all Hour Beeper notifications participate in the same visible iOS notification group/thread while preserving per-occurrence ownership metadata.

**Requirements:** R12, R15

**Dependencies:** None

**Files:**
- Modify: `src/features/chime/notificationEngine.ts`
- Test: `src/features/chime/notificationEngine.test.ts`

**Approach:**
- Extend the notification request content built in `buildNotificationRequests(...)` to include explicit iOS grouping metadata, not just title/body/sound/data.
- Use a stable thread identifier for all Hour Beeper notifications so iOS can stack them visually as related items.
- Add category metadata if needed to support grouped summaries cleanly rather than relying only on default system grouping.
- Preserve existing per-occurrence identifiers and metadata (`occurrenceId`, `scheduledFor`) so later cleanup logic can still distinguish current vs previous notifications.
- Keep the grouping metadata encapsulated inside the notification engine so the rest of the app continues to treat notification mode as a derived backend.

**Execution note:** Implement this unit test-first, starting with request-generation assertions for thread/category/summary metadata.

**Patterns to follow:**
- `src/features/chime/notificationEngine.ts`
- `src/features/chime/notificationEngine.test.ts`
- current Hour Beeper metadata shape in `buildNotificationRequests(...)`

**Test scenarios:**
- Happy path — generated notification requests include stable grouping metadata shared across multiple Hour Beeper occurrences.
- Happy path — per-occurrence identifiers and `scheduledFor` metadata remain unique even when the thread/category metadata is shared.
- Edge case — different sounds or schedule shapes still reuse the same grouping/thread identity.
- Error path — category-registration setup failure is isolated and does not prevent notification scheduling metadata from being generated.

**Verification:**
- Scheduled Hour Beeper notifications share explicit grouping metadata.
- Existing per-occurrence ownership and sequencing data remains intact.

- [ ] **Unit 2: Replace current-delivery cleanup with previous-on-next and keep-latest-on-active behavior**

**Goal:** Change runtime cleanup so the current notification survives as the newest visible representative while older Hour Beeper notifications are removed when possible.

**Requirements:** R12, R15, R18-R20

**Dependencies:** Unit 1

**Files:**
- Modify: `src/features/chime/notificationEngine.ts`
- Modify: `src/app/_layout.tsx`
- Test: `src/features/chime/notificationEngine.test.ts`

**Approach:**
- Replace the current runtime behavior that dismisses the just-received Hour Beeper notification.
- Add logic that, when notification `N` is received, identifies notification `N-1` from Hour Beeper’s own sequencing metadata and dismisses it if it is still presented.
- Replace the current “dismiss all Hour Beeper notifications on active” sweep with a “keep newest, dismiss older” sweep.
- Use app-owned metadata (`scheduledFor`, `occurrenceId`) to determine ordering instead of assuming Notification Center returns presented notifications in a reliable order.
- Keep listener registration idempotent and contained inside the existing runtime bootstrap path.
- Preserve failure tolerance: if dismissal fails or the previous notification is no longer present, the current notification should still remain visible and the app should continue normally.

**Technical design:** *(directional guidance, not implementation specification)*
- Normalize presented Hour Beeper notifications into an ordered list keyed by `scheduledFor`
- On receipt of `N`, compute the immediately previous known occurrence key and dismiss it if present
- On app active, sort all presented Hour Beeper notifications by occurrence time, keep the newest, dismiss the rest

**Patterns to follow:**
- `src/features/chime/notificationEngine.ts`
- `src/app/_layout.tsx`
- current runtime bootstrap pattern in `configureNotificationRuntime(...)`

**Test scenarios:**
- Happy path — when notification `N` is received and notification `N-1` is still presented, the runtime dismisses `N-1` and keeps `N`.
- Happy path — when app active sweep sees multiple presented Hour Beeper notifications, it keeps only the newest one and dismisses all older ones.
- Edge case — when `N-1` is already gone, the receipt-time handler does nothing destructive and leaves `N` alone.
- Edge case — foreign notifications in Notification Center are ignored by both the receipt-time handler and the app-active sweep.
- Edge case — duplicate or malformed Hour Beeper metadata falls back safely without dismissing the newest valid item incorrectly.
- Error path — dismissal or presented-notification inspection failure is logged/contained and does not break root layout initialization or schedule reconciliation.
- Integration — repeated runtime bootstrap calls still register only one listener set, and cleanup behavior remains idempotent across remounts.

**Verification:**
- Receipt-time cleanup targets the previous Hour Beeper notification rather than the current one.
- App-active cleanup leaves one newest Hour Beeper notification visible instead of clearing the entire stack.
- Root layout still initializes notification runtime exactly once.

- [ ] **Unit 3: Update product copy and dogfooding guidance for grouped-latest behavior**

**Goal:** Align docs and in-product mode descriptions with the new “group and keep latest” cleanup posture.

**Requirements:** R11, R12, R24

**Dependencies:** Unit 2

**Files:**
- Modify: `README.md`
- Modify: `src/components/settings/DeliveryModeSection.tsx`

**Approach:**
- Update the notification-mode description so it communicates grouped/best-effort collapsed behavior rather than blanket immediate cleanup.
- Keep the wording honest: while the app is alive or resumed, Hour Beeper tries to keep the visible stack collapsed to the latest notification; while terminated, iOS may still leave multiple artifacts.
- Preserve the evaluation framing so dogfooding can still compare visible clutter and annoyance against AlarmKit rather than hiding the tradeoff.

**Patterns to follow:**
- `README.md`
- `src/components/settings/DeliveryModeSection.tsx`

**Test scenarios:**
- Test expectation: none — documentation and copy updates only.

**Verification:**
- README and in-product mode copy describe the same grouped-latest behavior.
- The wording remains consistent with the origin requirement that notification mode is best-effort, not invisible.

## System-Wide Impact

- **Interaction graph:** `src/features/chime/notificationEngine.ts` owns request generation, grouping metadata, ownership filtering, receipt-time cleanup, and app-active cleanup; `src/app/_layout.tsx` remains the one-time bootstrap entry point; Expo notifications APIs provide scheduling, category setup, receipt events, and delivered-notification dismissal.
- **Error propagation:** Grouping/category setup or dismissal failures should remain local warnings or no-op results, not startup blockers or schedule-reconciliation failures.
- **State lifecycle risks:** The main risks are keeping the wrong delivered item, collapsing the whole stack accidentally, duplicate listener registration, and assuming presented-notification ordering that the OS does not guarantee.
- **API surface parity:** AlarmKit, persisted settings, and schedule materialization remain unchanged; only notification-mode presentation and cleanup strategy shift.
- **Integration coverage:** Real-device testing should cover foreground delivery, background-but-alive delivery, app-active sweeping after several missed chimes, terminated-app grouped stacking, and the absence of accidental dismissal of unrelated notifications.
- **Unchanged invariants:** Notification scheduling remains device-local, request identifiers remain occurrence-specific, permission flows remain the same, and notification mode still cannot promise fully invisible terminated-app delivery.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Grouping metadata may stack notifications visually but still not render exactly as expected on current iOS builds. | Treat grouping/threading as an on-device validation target and keep copy best-effort rather than absolute. |
| Previous-on-next dismissal may compute the wrong predecessor if metadata ordering is wrong or missing. | Base ordering on Hour Beeper’s own `scheduledFor` data and add malformed-metadata safety tests. |
| App-active sweeping may accidentally remove the newest representative. | Explicitly implement and test “keep newest, dismiss older” behavior rather than “dismiss all Hour Beeper notifications.” |
| Category setup may add configuration complexity without materially improving the grouped result. | Keep category use narrowly scoped and defer exact summary-format choices to implementation-time device validation. |

## Documentation / Operational Notes

- This plan still requires physical-device testing; simulator-only results are not enough to judge Notification Center grouping and stack collapse behavior on iOS.
- Dogfooding should compare clutter in at least three states: app foregrounded at delivery time, app backgrounded but still alive, and app terminated before several chimes fire.
- If this grouped-latest behavior materially improves notification mode, record the device findings later in a `docs/solutions/` note once the implementation is proven.

## Sources & References

- **Origin document:** `docs/brainstorms/2026-04-16-hourly-chime-app-requirements.md`
- Related code: `src/features/chime/notificationEngine.ts`
- Related code: `src/app/_layout.tsx`
- Related code: `src/features/chime/notificationEngine.test.ts`
- External docs: https://docs.expo.dev/versions/v55.0.0/sdk/notifications/
- External docs: https://developer.apple.com/documentation/usernotifications/unnotificationcontent
