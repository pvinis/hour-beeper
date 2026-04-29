# TODO



## Custom per-hour beeps

- [ ] Finish the implementation plan from `docs/brainstorms/2026-04-23-custom-per-hour-beeps-requirements.md`.
- [ ] Allow custom schedules with 5 or fewer selected hours to assign optional per-hour sound overrides.
- [ ] Preserve saved hour-to-sound assignments when the schedule temporarily becomes ineligible with 6+ selected hours.
- [ ] Expand the bundled sound library to at least 8 watch-like beep/chime sounds.

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

- [ ] Test foreground sound previews on a physical device, including repeated taps, rapid switching, silent switch, and volume behavior.
- [ ] Test with DND / Focus enabled.
- [ ] Test with silent switch enabled.
- [ ] Test after device reboot.
- [ ] Test across DST / timezone changes.
- [ ] Test after force-killing the app.
- [ ] Test without reopening the app after initial scheduling.
- [ ] Run a 3-day unattended test.

## Nice follow-ups

- [ ] Add a manual “dump pending notifications” debug action for faster diagnosis.
- [ ] Preserve raw trigger metadata in diagnostics instead of only mapping identifier/content.
- [ ] Document the final findings and the chosen scheduling strategy once the behavior is stable.
