# TODO

## work with the notification setup with the "repeats"

dont schedule just randomly 24 notifs. they should be repeats, based on what the users picks.

## allow teh user to pick specific hours in the day

## allow the user to pick a custom message if they pick less than 5 specific hours in the day.

## Fix the scheduling model

- [ ] Replace finite dated one-offs with repeating notifications where possible.
- [ ] Prefer **repeater-per-slot** instead of a rolling batch for current recurring schedules.
- [ ] Support interval testing with a single `timeInterval` trigger using `seconds: 60, repeats: true`.
- [ ] Support hourly production behavior with a repeating calendar trigger at `minute: 0`.
- [ ] For schedules with multiple recurring slots, model one repeating request per slot instead of many dated one-offs.
- [ ] Cancel previous app-owned pending requests before rescheduling so duplicates do not stack.
- [ ] Make repeater identifiers stable per logical slot so debugging stays understandable.

## Decide scheduling strategy

- [ ] Decide between:
  - [ ] **Path A:** repeater-per-slot, no top-up dependency
  - [ ] **Path B:** batch + top-up insurance
- [ ] Default recommendation: choose **Path A** for current V1 schedules.
- [ ] Only use **Path B** if we need irregular future schedules that repeaters cannot express cleanly.
- [ ] If we choose Path B, add background fetch/top-up only as insurance, not as the primary correctness mechanism.

## Improve diagnostics

- [ ] Add a better in-app notification diagnostics view.
- [ ] Show pending notification count.
- [ ] Show scheduled identifiers.
- [ ] Show trigger type where possible.
- [ ] Show next trigger time(s) where possible.
- [ ] Show last reconciliation timestamp.
- [ ] Show current schedule mode.
- [ ] Show Low Power Mode state.
- [ ] Keep build version / git SHA visible in diagnostics.

## 1min interval

- [ ] only show it on staging builds and dev builds, not in prod
- [ ] rename it to something like "every 1min (only for short debugging)"

## Confirm boring-but-important details

- [ ] Make sure to ask the user to enable the notifs for the app, and point them to the settings.app if they have declined it.

## Long-run validation matrix

- [ ] Test with DND / Focus enabled.
- [ ] Test with silent switch enabled.
- [ ] Test after device reboot.
- [ ] Test across DST / timezone changes.
- [ ] Test after force-killing the app.
- [ ] Test without reopening the app after initial scheduling.
- [ ] Run a 3-day unattended test.
- [ ] Compare notification mode vs AlarmKit mode under the same schedule and sound.

## Nice follow-ups

- [ ] Add a manual “dump pending notifications” debug action for faster diagnosis.
- [ ] Preserve raw trigger metadata in diagnostics instead of only mapping identifier/content.
- [ ] Document the final findings and the chosen scheduling strategy once the behavior is stable.
