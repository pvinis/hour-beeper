---
date: 2026-04-16
topic: hourly-chime-app
---

# Hourly Chime App Requirements

## Problem Frame
Build a simple iOS app inspired by old Casio watch hourly chimes: the user chooses when the phone should emit a brief beep, and the app reliably does so even when the app is not actively open. The product should stay intentionally small, feel as native as possible, and avoid turning into a general alarm/reminder app.

The main product tension is platform behavior on iOS. The app's first priority is closed-app delivery. The second priority is minimizing notification center clutter when notifications are involved. Because Apple offers multiple system paths with different tradeoffs, V1 should let the team dogfood both major delivery approaches on-device before locking in the long-term default.

## Requirements

**Scheduling and Chime Behavior**
- R1. The app must let the user enable and disable recurring chimes.
- R2. The app must provide preset cadence options for every 30 minutes, every 1 hour, every 2 hours, and every 4 hours.
- R3. The app must provide a custom schedule mode where the user selects one or more hours from `00` through `23`.
- R4. In V1, custom-hour selections must fire at `:00` for the selected hours.
- R5. The scheduling model must preserve a clear upgrade path for future minute-level custom times without forcing users to relearn the product.
- R6. The app must offer a small set of bundled beep/chime sounds for the user to choose from.
- R7. Scheduled chimes should follow the device's current local time. After timezone changes, daylight saving changes, reboot, app update, or manual clock changes, future chimes should realign to the current device clock rather than staying pinned to a previous timezone context.

**Delivery Modes and Evaluation**
- R8. V1 must include two user-visible delivery modes: a notification-based mode and an AlarmKit-based mode.
- R9. Both delivery modes must operate against the same schedule and preference model so a user can switch modes without re-entering their schedule.
- R10. The app must provide an easy in-app way to switch between delivery modes during dogfooding.
- R11. The app must explain each delivery mode in-product with concise copy that covers availability, likely behavior, and the tradeoff between subtlety and system-level reliability before or during mode selection.
- R12. Notification mode must target the lowest-clutter user-facing behavior that still preserves closed-app delivery, including best-effort cleanup and grouping where platform rules allow, even if perfect invisibility is not achievable.
- R13. AlarmKit mode must be treated as a first-class path for evaluation rather than a hidden experiment.
- R14. AlarmKit mode must appear only on iOS versions that support AlarmKit; on other supported iOS versions, the app must still offer notification mode.
- R15. V1 must make it possible to compare the two delivery modes on real devices using the same schedule, sound, and core settings.

| Delivery mode | Core value | Known tradeoff | Why it is in V1 |
|---|---|---|---|
| Notification mode | Broad compatibility and a subtler watch-like feel | May leave visible notification artifacts; respects normal notification behavior | Establishes the smallest viable version and the likely future Android analog |
| AlarmKit mode | Stronger closed-app, system-native alarm behavior | More prominent system UI and newer-iOS dependence | Lets dogfooding test whether reliability is worth the added prominence |

**User Experience and Permissions**
- R16. The UI must feel natively iOS-first rather than heavily custom-branded.
- R17. The mode switch may be visible to all users in V1, but it is intended as a temporary evaluation feature and may be removed before final release.
- R18. The main settings surface must show the currently active schedule, selected sound, selected delivery mode, and whether delivery is active or blocked by permissions.
- R19. The app must define a clear first-run permission flow for notifications and any AlarmKit authorization it needs.
- R20. If required permissions are denied, the app must explain what is unavailable and how to re-enable the needed permission from system settings.

**Persistence and Data**
- R21. User settings, including schedule, sound choice, enablement, and selected delivery mode, must persist locally across launches.
- R22. V1 local persistence should prefer the app-state approach based on jotai and expo-sqlite unless a delivery-mode integration constraint forces a targeted exception.
- R23. iCloud-backed sync is not required to ship V1, but planning should investigate whether the preferred persistence approach can support sync later.
- R24. The app must preserve enough dogfooding evidence to support a deliberate post-test decision on the long-term default delivery mode.

## Success Criteria
- A user can configure a preset or custom-hour schedule and receive the chosen chime while the app is not actively open on supported devices.
- Under normal device conditions, delivered chimes should occur close enough to the scheduled boundary to feel like an hourly chime product, with a target tolerance of roughly within 60 seconds of the scheduled time during dogfooding.
- A user can switch between notification mode and AlarmKit mode without rebuilding their schedule.
- Short dogfooding on real devices produces a clear comparison of the two delivery modes across reliability, subtlety, notification-center side effects, and overall annoyance/prominence.
- The V1 test period yields a documented decision about the long-term default delivery mode.
- The shipped V1 surface remains focused on the hourly-chime use case rather than drifting into a broader reminder/alarm product.

## Scope Boundaries
- Android is out of scope for the first release, though the product should avoid painting itself into a corner for future Android support.
- App name, icon, and final branding are not blockers for planning this feature.
- iCloud sync is not required in V1.
- Minute-level custom scheduling is not required in V1.
- A permanent public delivery-mode switch is not part of the long-term product commitment; it exists in V1 primarily to support evaluation.
- Notification mode is not required to bypass Silent Mode.
- The app does not promise a fully invisible background sound mechanism if iOS platform rules require visible notification surfaces.

## Key Decisions
- Dual-mode V1: build both notification delivery and AlarmKit delivery, then compare them through real on-device use before choosing the long-term default.
- Visible evaluation control: keep the delivery-mode switch user-visible in V1 so dogfooding does not require hidden tooling.
- Hour-first custom scheduling: custom mode selects hours only in V1, with future flexibility for minutes.
- Closed-app delivery over purity: reliability when the app is not running matters more than achieving a perfectly hidden beep path.
- Broad-support baseline plus conditional AlarmKit: the product should work on supported iPhones through notification mode even where AlarmKit is unavailable.

## High-Level Technical Direction
- Bootstrap from the existing LeanScaper `mobile-app` repo as inspiration, keeping only shell pieces that materially accelerate this product.
- Perform an early cleanup pass that removes unrelated product domains and support infrastructure before feature work begins.
- Prefer jotai plus expo-sqlite for local persistence unless a delivery-mode requirement forces a narrow exception.

## Dependencies / Assumptions
- Apple platform behavior may prevent a fully hidden sound-only notification path when the app is not running.
- AlarmKit availability is limited to newer iOS versions, and exact app minimum-version decisions can be finalized during planning.
- Silent Mode behavior may differ materially between notification delivery and AlarmKit delivery.
- The initial codebase bootstrap is a speed optimization, not a commitment to retain the inspiration app's product architecture.

## Outstanding Questions

### Deferred to Planning
- [Affects R12][Needs research] What is the best achievable strategy to reduce notification-center clutter for recurring chimes on iOS without sacrificing delivery reliability?
- [Affects R13][Needs research] Can AlarmKit represent the preset cadences and custom selected-hour schedules directly, or should the app materialize multiple alarms behind the scenes?
- [Affects R22][Needs research] Can the preferred jotai plus expo-sqlite persistence approach participate in iCloud-backed sync, or will sync require a separate mechanism later?
- [Affects R24][Technical] What lightweight evidence capture should V1 use during dogfooding so the team can choose a default delivery mode confidently?
- [Affects High-Level Technical Direction][Technical] Which shell pieces from the inspiration app are worth retaining, and which should be removed immediately in the cleanup pass?

## Next Steps
-> /ce:plan for structured implementation planning
