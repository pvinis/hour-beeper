---
date: 2026-04-23
topic: custom-per-hour-beeps
---

# Custom Per-Hour Beeps Requirements

## Problem Frame

Hour Beeper already lets the user choose a single bundled sound and already supports custom-hour schedules. The next improvement is to make sparse custom schedules feel more expressive: when a user picks only a few specific hours, they should be able to give different hours different beep sounds instead of forcing one sound across the whole day.

The feature should stay small and watch-like. It should extend the current sound model rather than turning the app into a general reminder composer. It also needs a clear limit so the settings UI stays simple and scheduling stays understandable.

## Requirements

**Eligibility and User Behavior**
- R1. Per-hour custom beep selection must be available only for `custom` schedules, not for preset schedules.
- R2. Per-hour custom beep selection must be available only when the user has selected 5 or fewer custom hours.
- R3. Preset schedules must continue using one global selected sound only.
- R4. For eligible custom schedules, the global sound must remain the default sound, and the user may optionally override the sound for any selected hour.
- R5. The same bundled sound may be reused across multiple selected hours; hours do not need unique sounds.

**State Changes and Persistence**
- R6. If the user increases a custom-hour schedule from 5 or fewer selected hours to more than 5 selected hours, the app must stop using per-hour overrides and fall back to the global sound.
- R7. When per-hour overrides are disabled because the user selected more than 5 hours, the app must preserve the saved hour-to-sound assignments so they can be restored later.
- R8. If the user later returns to 5 or fewer selected hours, the previously saved per-hour overrides must become active again for any currently selected hour that still has a saved override.
- R9. If the user removes a custom hour and later re-adds that same hour, the app must restore that hour’s previous per-hour sound override if one had been saved.
- R10. If the user has zero custom hours selected, no per-hour sound overrides are active.

**Sound Library and UX Communication**
- R11. The app must ship with at least 8 total bundled sounds so the per-hour override feature offers meaningful variety.
- R12. Added bundled sounds must still fit the product’s brief beep/chime identity rather than pushing the app toward general alarm or novelty-sound behavior.
- R13. The settings UI must clearly communicate that custom per-hour sounds are available only for up to 5 selected hours.
- R14. When the user has more than 5 custom hours selected, the per-hour sound controls must stay visible in a disabled, read-only state so it is clear the saved assignments still exist and will return when the user goes back to 5 or fewer hours.


## Behavior Summary

| Schedule state | Sound behavior |
| --- | --- |
| Preset schedule | Use the single global sound |
| Custom schedule with 0 selected hours | No active per-hour overrides |
| Custom schedule with 1-5 selected hours | Use the global sound by default, with optional per-hour overrides |
| Custom schedule with 6+ selected hours | Use the single global sound, keep per-hour overrides saved and visible as inactive read-only assignments |

## Success Criteria

- A user with a sparse custom schedule can assign different bundled beeps to different selected hours without losing the app’s simple settings-first feel.
- Moving above and below the 5-hour limit behaves predictably: overrides disappear from active use when ineligible and come back when eligible again.
- A user never has to recreate hour-to-sound assignments just because they temporarily selected too many hours.
- The bundled sound library feels broad enough to make per-hour customization worthwhile.
- The feature does not change the product into a general alarm/reminder customization surface.

## Scope Boundaries

- No custom message entry.
- No user-uploaded or recorded sounds.
- No per-slot custom sounds for preset schedules.
- No minute-level custom sound assignment; this feature still applies only to hour-based custom schedules.
- No requirement to make every selected custom hour choose an explicit override; the global sound remains a valid default.

## Key Decisions

- **Custom-hours only:** Per-hour customization is reserved for the part of the product where users are already expressing intentional sparse scheduling.
- **5-hour cap:** This is a deliberate V1 product rule so the feature stays compact and legible rather than scaling into a dense matrix editor.
- **Global sound remains the default:** This keeps the existing mental model intact and makes per-hour beeps an extension rather than a replacement.
- **Saved overrides survive ineligible states:** Going above the cap should feel like temporarily disabling an advanced option, not deleting the user’s work.
- **Expand the bundled sound set:** Per-hour assignment is only compelling if the sound library has enough variety to justify it.

## Dependencies / Assumptions

- The current app already has a global sound picker and a custom-hour schedule picker.
- Planning should define a persisted hour-to-sound override model that preserves dormant overrides without weakening schedule reconciliation or migration safety.
- Planning should verify that per-hour sound overrides can coexist cleanly with the current repeating-notification scheduling model and sound packaging behavior.
- Planning should verify that the added bundled sounds behave consistently in physical-device notification delivery, not just in development.

## Outstanding Questions

### Deferred to Planning
- [Affects R11-R12][Needs research] Which additional bundled beep/chime sounds best expand variety while still fitting the product’s watch-like identity?
- [Affects R13-R14][Technical] What is the simplest settings UI pattern for showing default-vs-override sound choice without making the custom-hours section feel heavy?
- [Affects R6-R10][Technical] What persistence shape best preserves dormant hour-to-sound overrides without making schedule reconciliation brittle?

## Next Steps

-> /ce:plan for structured implementation planning
