---
title: fix: Remove React Native deprecation warnings from app startup
type: fix
status: active
date: 2026-04-17
---

# fix: Remove React Native deprecation warnings from app startup

## Overview

Eliminate the current React Native startup warnings for `SafeAreaView`, `ProgressBarAndroid`, `Clipboard`, `InteractionManager`, and `PushNotificationIOS` without changing Hour Beeper product behavior.

The repo search indicates these warnings are not coming from app feature code. They are coming from the current Uniwind integration boundary, especially the install-time patch path and Uniwind’s exported component registry. This plan fixes the problem at that boundary instead of scattering app-level workarounds across the codebase.

## Problem Frame

The app is on Expo 55 / React Native 0.83.4 and already depends on `react-native-safe-area-context`, but startup still emits warnings for APIs React Native has deprecated or extracted from core.

Local repo research found:

- no direct app imports of `SafeAreaView`, `ProgressBarAndroid`, `Clipboard`, `InteractionManager`, or `PushNotificationIOS` from `react-native`
- an existing narrow postinstall patch in `scripts/patch-uniwind.mjs` that only targets `PushNotificationIOS`
- active Uniwind usage in `src/app/_layout.tsx` and `src/utils/Providers/UniwindSafeAreaListener.tsx`
- current Uniwind package files in `node_modules/uniwind/` still exporting deprecated core getters, including the exact warning surfaces the app sees at startup

That means the real problem is not “migrate five app imports.” It is “stop the styling dependency boundary from touching deprecated React Native exports during app startup.”

## Requirements Trace

- **R1** — App startup should stop emitting the current deprecation warnings for `SafeAreaView`, `ProgressBarAndroid`, `Clipboard`, `InteractionManager`, and `PushNotificationIOS`.
- **R2** — Existing app behavior must remain unchanged: styling resolution, safe-area inset handling, notifications, and AlarmKit behavior should keep working as they do now.
- **R3** — The fix must be durable across reinstall flows and not rely on hand-editing `node_modules/`.
- **R4** — The repo should fail predictably when the patched upstream package changes shape, rather than silently regressing.

## Scope Boundaries

- No migration away from Uniwind in this pass.
- No React Native version upgrade or Expo SDK upgrade as part of this fix.
- No product/UI redesign work.
- No notification feature changes beyond removing the startup warning source.
- No speculative adoption of extracted community packages unless the implementation proves Uniwind still needs a supported runtime fallback for a specific surface.

### Deferred to Separate Tasks

- Replacing Uniwind entirely if the dependency continues to fight current React Native releases.
- Upstream contribution or fork maintenance strategy after the local fix proves stable.
- Broader dev-experience cleanup for unrelated warnings.

## Context & Research

### Relevant Code and Patterns

- `package.json` declares `expo@~55.0.11`, `react-native@0.83.4`, `react@19.2.0`, `react-native-safe-area-context@~5.6.2`, and `uniwind@^1.6.2`.
- `scripts/patch-uniwind.mjs` already establishes the local pattern of fixing a third-party dependency via an idempotent postinstall patch instead of editing `node_modules/` manually.
- `src/utils/Providers/index.tsx` and `src/utils/Providers/UniwindSafeAreaListener.tsx` already use `react-native-safe-area-context` as the repo’s supported safe-area integration.
- `src/components/Screen.tsx` applies safe-area spacing via Uniwind classes (`pt-safe`, `pb-safe`, `py-safe`) and does not depend on React Native core `SafeAreaView`.
- `src/app/_layout.tsx` is the root runtime entry point where Uniwind hooks are active during app startup.
- `node_modules/uniwind/src/components/index.ts` currently includes getters for the exact deprecated/extracted React Native surfaces in the warning output, and upstream `uni-stack/uniwind` main still shows the same pattern.

### Institutional Learnings

- There is no `docs/solutions/` directory in this repo yet, so local grounding comes from the current codebase, existing plan documents, and the installed dependency tree.

### External References

- React Native’s warnings and docs now direct `SafeAreaView` usage to `react-native-safe-area-context`, extracted Clipboard usage to `@react-native-clipboard/clipboard`, extracted PushNotificationIOS usage to `@react-native-community/push-notification-ios`, and deprecated long-task scheduling away from `InteractionManager` toward `requestIdleCallback`.
- Uniwind’s `withUniwind` documentation recommends wrapping third-party `react-native-safe-area-context` components rather than relying on React Native core `SafeAreaView`.
- Upstream issue reports in the NativeWind/Uniwind ecosystem show the same SafeAreaView warning pattern on RN 0.81+ / 0.83-era apps, which supports treating this as a dependency-boundary problem rather than an Hour Beeper-specific feature bug.

## Key Technical Decisions

| Decision | Rationale |
|---|---|
| Fix the warning source at the Uniwind boundary, not in feature code. | Repo search found no direct app imports of the deprecated APIs, so app-level migrations would not remove the actual startup warnings. |
| Replace the current one-off `PushNotificationIOS` patch with a full compatibility transform. | The existing patch is too narrow and still touches the deprecated getter path; the warning set shows multiple exported surfaces need treatment together. |
| Keep safe-area handling rooted in `react-native-safe-area-context`. | The app already uses `SafeAreaProvider` and a safe-area listener; this aligns with React Native guidance and avoids reintroducing core `SafeAreaView`. |
| Pin and verify the patched Uniwind contract while a local patch exists. | A caret dependency plus a string-based vendor patch is too easy to regress silently on reinstall or minor upstream changes. |

## Open Questions

### Resolved During Planning

- **Are the warnings coming from app code imports?** No. Repo search found no direct app imports of the deprecated React Native surfaces.
- **Is waiting for an upgrade enough?** Not currently. The installed `uniwind@1.6.2` package and upstream main both still expose the problematic getter pattern.
- **Should this fix add new extracted-package dependencies immediately?** Not by default. First remove the app’s accidental contact with deprecated getters; only add a supported fallback package if implementation proves a specific runtime path still genuinely needs it.

### Deferred to Implementation

- **Which exact Uniwind artifact files need patching?** Package exports suggest React Native uses source files, but the implementation should verify the actual files participating in Expo startup and patch the minimum complete set.
- **Should the compatibility transform delete unsupported getters entirely or replace them with guarded fallbacks?** This depends on whether any startup/runtime path truly needs those exports after the registry is cleaned up.
- **Should the repo keep a local patch long-term or move to a fork/upstream fix?** That decision should follow successful validation of the local compatibility approach.

## Alternative Approaches Considered

- **Wait for a newer Uniwind release** — rejected for this fix because current upstream code still shows the deprecated getter pattern.
- **Migrate off Uniwind immediately** — rejected because it is much larger than the current problem and would mix warning cleanup with a styling-system migration.
- **Ignore the warnings** — rejected because they hide real diagnostics and make future React Native upgrades harder to trust.

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

| Warning surface | Intended treatment | Why |
|---|---|---|
| `SafeAreaView` | Remove the deprecated core registration path and keep repo usage on `react-native-safe-area-context`. | Matches existing app architecture and current React Native guidance. |
| `ProgressBarAndroid`, `Clipboard`, `PushNotificationIOS` | Stop Uniwind startup from touching the deprecated core getters; only introduce guarded fallbacks if runtime usage proves necessary. | The app does not directly use these surfaces today. |
| `InteractionManager` | Prevent the deprecated getter from being touched during startup; do not add a behavior shim unless implementation finds a real consumer. | This is a startup-warning cleanup, not a scheduler redesign. |
| Install-time safety | Move from a single string swap to a multi-surface, idempotent compatibility transform plus verification. | This keeps the fix durable across reinstalls and minor dependency churn. |

## Implementation Units

- [ ] **Unit 1: Replace the narrow Uniwind patch with a full deprecation-compatibility transform**

**Goal:** Stop the installed Uniwind package from touching the deprecated React Native exports that currently trigger startup warnings.

**Requirements:** R1, R3, R4

**Dependencies:** None

**Files:**
- Modify: `scripts/patch-uniwind.mjs`
- Test: `scripts/patch-uniwind.test.ts`

**Approach:**
- Replace the current one-surface `PushNotificationIOS` patch with a deterministic transform that targets all five warning surfaces together.
- Make the transform idempotent so reinstalling dependencies or rerunning postinstall does not duplicate edits.
- Treat `SafeAreaView` separately from the extracted/deprecated utility APIs: the safe-area path should align with `react-native-safe-area-context`, while the other surfaces should stop referencing React Native core unless implementation proves a supported fallback is required.
- Prefer patch logic that fails or warns clearly when upstream markers disappear, instead of silently claiming success.
- Keep the patch focused on the Uniwind files actually exercised by the React Native / Expo runtime path rather than broad, speculative edits across the package.

**Execution note:** Add characterization fixtures first so the implementation starts from the exact currently-installed Uniwind file shape.

**Patterns to follow:**
- `scripts/patch-uniwind.mjs`
- current postinstall wiring in `package.json`

**Test scenarios:**
- Happy path — given the current installed Uniwind component registry, the patch rewrites all five warning surfaces and preserves unrelated exports.
- Edge case — running the patch a second time leaves the transformed file unchanged and reports an already-patched/no-op result.
- Edge case — if only a subset of markers is present, the patch reports exactly which transforms were applied and which were missing.
- Error path — if the upstream file layout changes enough that the patch can no longer prove what it is changing, the script exits with an actionable failure signal instead of silently succeeding.
- Integration — the patched vendor artifact no longer contains direct references to the deprecated React Native getters in the transformed regions used at startup.

**Verification:**
- A fresh install followed by postinstall produces patched Uniwind artifacts with no direct startup path to the five deprecated React Native getters.
- Patch output makes success vs drift obvious.

- [ ] **Unit 2: Pin and document the patched dependency contract**

**Goal:** Prevent silent regressions caused by minor-version drift while the repo carries a local compatibility patch.

**Requirements:** R3, R4

**Dependencies:** Unit 1

**Files:**
- Modify: `package.json`
- Modify: `bun.lock`
- Modify: `README.md`

**Approach:**
- Replace the caret-based Uniwind dependency with an exact version while the repo depends on a vendor patch.
- Document that the repo intentionally patches Uniwind for React Native 0.83 compatibility and that upgrading the package requires revalidating the patch.
- Keep the documentation lightweight and operational: enough for the next implementer to understand why the version is pinned and how to evaluate future upgrades.

**Patterns to follow:**
- existing dependency/version management in `package.json`
- lightweight repo-level operational notes in `README.md`

**Test scenarios:**
- Test expectation: none — this unit is dependency pinning and maintainership documentation rather than feature behavior.

**Verification:**
- Dependency installation resolves the intended Uniwind version consistently.
- The repo clearly communicates why the version is pinned and when it is safe to unpin.

- [ ] **Unit 3: Add a regression harness for future warning reintroduction**

**Goal:** Catch future dependency or patch drift before it returns the warnings to app startup.

**Requirements:** R1, R3, R4

**Dependencies:** Units 1-2

**Files:**
- Create: `scripts/verify-uniwind-compat.mjs`
- Create: `scripts/verify-uniwind-compat.test.ts`
- Modify: `package.json`

**Approach:**
- Add a small verification script that inspects the installed Uniwind files used by this repo and fails when forbidden deprecated getter references reappear.
- Keep the harness independent of launching the app, so it can validate the install-time contract quickly and deterministically.
- Use the same forbidden-surface list as the user-reported warnings to keep the regression check aligned with the original problem.
- Avoid over-fitting the harness to exact file formatting; assert the compatibility contract, not incidental whitespace.

**Patterns to follow:**
- existing Vitest-style unit tests such as `src/features/chime/notificationEngine.test.ts`
- current script-based repo utilities in `scripts/`

**Test scenarios:**
- Happy path — the verification script passes when the patched Uniwind runtime path no longer references the forbidden React Native core surfaces.
- Edge case — the verification script tolerates idempotent patch output and non-semantic formatting differences.
- Error path — the verification script fails with a clear message naming the first reintroduced forbidden surface.
- Integration — a fresh dependency install plus the postinstall patch leaves the verification script green without starting Expo.

**Verification:**
- The repo has a deterministic regression check for this warning family.
- Future package churn fails in a narrow, actionable place rather than at app startup.

## System-Wide Impact

- **Interaction graph:** `package.json` postinstall -> `scripts/patch-uniwind.mjs` -> installed `node_modules/uniwind/*` runtime files -> app startup through `src/app/_layout.tsx` and safe-area provider setup in `src/utils/Providers/index.tsx`.
- **Error propagation:** Patch drift should surface as an install/verification failure, not as a silent runtime degradation that only appears when launching the app.
- **State lifecycle risks:** Dependency reinstalls, cache clears, and version bumps are the main regression points; the plan intentionally moves those failures earlier and makes them deterministic.
- **API surface parity:** App code should continue using `react-native-safe-area-context` for safe-area behavior and should not add new imports from deprecated React Native core surfaces while this compatibility boundary exists.
- **Integration coverage:** Validation should cover fresh install, repeated install, and startup-path inspection of the actual Uniwind files consumed by the repo’s React Native runtime.
- **Unchanged invariants:** Notification scheduling, AlarmKit bridging, styling semantics, and the current safe-area inset behavior should remain unchanged.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Upstream Uniwind changes file layout and breaks the patch. | Pin the dependency, key the patch off explicit markers, and add a verification script that fails loudly. |
| The patch removes or guards an export that some startup path still genuinely needs. | Verify actual repo imports and runtime paths first; only add targeted supported fallbacks when a real consumer is proven. |
| The implementation patches the wrong artifact file and warnings still appear. | Validate the actual React Native/Expo resolution path used by this repo and make the regression harness inspect that same path. |
| The local patch becomes long-lived technical debt. | Document the pin, reference the upstream issue/path, and treat replacement with an upstream fix or fork as a follow-up decision once the local fix is stable. |

## Documentation / Operational Notes

- While the repo carries a local Uniwind compatibility patch, dependency upgrades should be treated as intentional maintenance work, not routine drift.
- If upstream ships a real fix later, the clean exit path is: validate the new version, remove the local patch and verification exception, then unpin intentionally.
- After implementation, capture the final outcome in `docs/solutions/` if this workaround proves valuable for future React Native upgrades.

## Sources & References

- Related code: `package.json`
- Related code: `scripts/patch-uniwind.mjs`
- Related code: `src/app/_layout.tsx`
- Related code: `src/utils/Providers/index.tsx`
- Related code: `src/utils/Providers/UniwindSafeAreaListener.tsx`
- Related code: `src/components/Screen.tsx`
- External docs: https://reactnative.dev/docs/safeareaview
- External docs: https://reactnative.dev/docs/interactionmanager
- External docs: https://docs.uniwind.dev/api/with-uniwind
- External reference: https://github.com/uni-stack/uniwind
- External reference: https://github.com/nativewind/nativewind/issues/1707
