# Plan Review Findings

## Sequencing
- **High — Bootstrap/reference contradiction:** Unit 1 removes `modules/expo-live-activity/`, but Unit 4 treats it as a local scaffolding reference. **Action:** Pin the reference externally or defer deletion until the AlarmKit module scaffold is captured.
- **High — Scheduler contract not frozen before dual-engine work:** Units 3 and 4 both mutate `src/features/chime/scheduler.ts` after Unit 2 without a defined engine/coordinator interface. **Action:** Add an explicit post-Unit-2 contract checkpoint for settings materialization, reconciliation, and engine adapter methods.
- **Medium — UX validation waits on both backends:** Unit 5 starts only after Units 3 and 4, so R18-R20 cannot be exercised early with mocked engines. **Action:** Split Unit 5 into an early settings/permission shell and a later backend-integration polish pass.

## Scope Hygiene
- **High — Bootstrap unit is still too expansive:** “Copy shell then prune” plus broad config cleanup makes Unit 1 a high-churn import-and-delete exercise. **Action:** Convert Unit 1 to an allowlist bootstrap or a scripted keep/remove checklist with exit criteria.
- **Medium — Unit 1 claims downstream product requirements:** Tagging Unit 1 with R16-R24 overstates its scope and weakens traceability. **Action:** Narrow Unit 1 to shell/setup prerequisites and move UI, permission, and diagnostics ownership to later units only.
- **Medium — Unit 6 mutates the source requirements doc:** Rewriting the origin doc during implementation mixes execution with source-of-truth requirements. **Action:** Keep the requirements doc stable and capture clarifications in a decision log or follow-up plan note.

## Missing Risks
- **High — Pending notification cap is unaddressed:** Preset cadences can exhaust iOS local-notification limits if the app materializes too far ahead. **Action:** Add a rolling scheduling window, refresh triggers, and cap-handling behavior before Unit 3.
- **High — Reboot/terminated-state realignment is underspecified:** R7 expects recovery after reboot, app update, and manual clock changes, but the plan only defines reconciliation on app-driven events. **Action:** Document which recovery paths are guaranteed by the OS versus require next-app-open reconciliation, and reflect that in UX copy and tests.
- **High — AlarmKit shipping risk is under-modeled:** The plan references iOS 26+ support but not entitlement, App Review, or Expo-native integration failure modes. **Action:** Add spike exit criteria and a fallback rule that keeps V1 notification-first if AlarmKit viability slips.

## Requirements Trace Gaps
- **High — R7 is only partially traced:** Timezone and DST are covered, but reboot, app update, and manual clock change behavior are not owned by a unit with verification steps. **Action:** Add an explicit `R7 -> unit -> verification` entry for each trigger.
- **Medium — R19/R20 lack a single cross-engine permission flow:** Permission handling is scattered across Units 3, 4, and 5 without one acceptance test for first-run and denied-state recovery. **Action:** Add a dedicated permission-state flow spec and an integration test matrix covering both engines.
- **Medium — R23/R24 do not produce auditable artifacts:** Sync-feasibility investigation and dogfooding decision support are mentioned, but the plan does not require a named note, rubric, or report. **Action:** Add explicit deliverables such as a short sync-feasibility memo and a comparison rubric/checklist.

## Units That Still Require Invention
- **High — AlarmKit cadence mapping remains open:** The plan admits non-weekly cadences may require multiple AlarmKit artifacts but never defines the canonical mapping. **Action:** Specify one materialization algorithm with worked examples before Unit 4 implementation.
- **Medium — Notification cleanup behavior is still “best effort”:** Identifier shape, grouping keys, and stale-delivery cleanup semantics are not concrete enough for consistent implementation. **Action:** Turn the clutter strategy into acceptance criteria for Unit 3.
- **Medium — Diagnostics are collected without a decision rubric:** The plan lists candidate fields, but not the threshold for choosing the long-term default mode. **Action:** Define the minimum fields and the comparison rubric before Unit 6 starts.
