---
title: Release Hour Bell on iOS App Store
status: active
created: 2026-05-13
origin: user request + App Store / Expo release research
---

# Release Hour Bell on iOS App Store

## Goal

Ship `Hour Bell` (`com.pvinis.hourbeeper`) to the iOS App Store through App Store Connect, using the existing Expo/EAS release path, with enough validation and store metadata to survive App Review and avoid over-claiming notification behavior.

## Current repo state

- App: Expo SDK 55 / React Native 0.83 app.
- Production app config already exists in `app.config.ts`:
  - Name: `Hour Bell`
  - Bundle ID: `com.pvinis.hourbeeper`
  - Scheme: `hour-beeper`
  - Apple team: `CAG2W9M777`
  - Export compliance flag: `ITSAppUsesNonExemptEncryption: false`
- EAS is already configured in `eas.json`:
  - `cli.appVersionSource = remote`
  - production build profile with auto-increment
  - iOS submit config with `ascAppId: 6768447598`
  - `bun build:prod:ios` maps to a production iOS EAS build with `--auto-submit`
- App behavior depends on local notifications and custom notification sounds, so physical-device validation is the release gate.

## External requirements found

- Apple requires an Apple Developer Program account and an App Store Connect app record before distribution.
- App Store Connect upload requires a valid bundle ID, signing credentials/provisioning profile, app icon, launch screen, unique build number, and complete app metadata.
- Since 2026-04-28, new uploads must be built with Xcode 26 / iOS 26 SDK or later. EAS builder image selection must satisfy this before submitting.
- TestFlight builds remain available for testing for up to 90 days.
- App Privacy details are required in App Store Connect, including third-party SDK data practices.
- App Review checks safety, performance, business model, design, legal, and privacy. Notifications must be related to app functionality and require user permission.
- App screenshots are required in App Store Connect; Apple accepts 1–10 screenshots per required display size, with current high-resolution iPhone sizes such as 6.9-inch portrait `1320 x 2868` and 6.5-inch portrait `1284 x 2778`/`1242 x 2688` depending on the display bucket.

Sources:

- Apple: Submitting apps — https://developers.apple.com/app-store/submitting
- Apple: Upcoming requirements — https://developers.apple.com/news/upcoming-requirements
- Apple: Preparing your app for distribution — https://developer.apple.com/documentation/xcode/preparing-your-app-for-distribution
- Apple: TestFlight overview — https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview
- Apple: App Privacy Details — https://developer.apple.com/support/app-privacy-on-the-app-store
- Apple: App Review Guidelines — https://developers.apple.com/app-store/review/guidelines
- Apple: Screenshot specifications — https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications
- Expo: Submit to Apple App Store — https://docs.expo.dev/submit/ios
- Expo: EAS Submit — https://docs.expo.dev/submit/introduction
- Expo: Build app-store production builds — https://docs.expo.dev/deploy/build-project
- Expo: App version management — https://docs.expo.dev/build-reference/app-versions

## Release gates

### Gate 1 — finish product validation

Before uploading the release candidate for review:

- Complete iOS physical-device validation from `README.md` notes:
  - permission prompt appears only at the right moment
  - hourly / 30-min / 2-hour / custom schedules fire at expected local times
  - selected custom notification sound plays in foreground, background, locked, and terminated states where iOS allows it
  - notification cleanup does not stack excessive notifications
  - tapping notification opens the app
  - changing schedule/sound reconciles future notifications
  - relaunch/reboot/timezone/manual-clock changes do not leave stale schedules
  - silent switch and Focus behavior are observed and described accurately
- Complete `docs/media-continuity-validation.md` for iOS, especially the current branch’s media-preservation work.
- Decide exactly what the App Store copy may claim. Avoid promising impossible OS-owned behavior like “guaranteed hourly alarm under all device states.” Prefer “gentle local hourly chimes” with caveats in support docs if needed.

### Gate 2 — app-store metadata and legal

Prepare in App Store Connect:

- App name/subtitle:
  - Current ASC name: `Hour Bell - Hourly Chime`
  - Display name in app: `Hour Bell`
- Category: likely `Productivity`, `Utilities`, or `Lifestyle`; pick one and keep copy aligned.
- Age rating questionnaire.
- Support URL.
- Privacy Policy URL. Even if the app collects no personal data, Apple requires the link.
- App Privacy answers:
  - likely “Data Not Collected” if the app has no analytics, accounts, remote backend, crash reporting, ad SDKs, or tracking.
  - verify Expo modules and any production services before selecting this.
- Export compliance:
  - app config already declares `ITSAppUsesNonExemptEncryption: false`; mirror the same answer in App Store Connect if prompted.
- Review information:
  - no login/demo account needed if the app is accountless.
  - add reviewer notes explaining that the app uses local notification permission to schedule opt-in chimes and includes bundled notification sounds.
- Pricing/availability.
- Copyright / contact details.

### Gate 3 — visual assets

- Verify `assets/app-icon.png` is production-quality and meets Apple’s icon requirements via Expo/EAS output.
- Capture clean iPhone screenshots for the required App Store sizes:
  - Home/settings with chimes disabled
  - schedule selection
  - sound selection / preview
  - diagnostics or permission state only if it helps explain the app
- Optional: create framed marketing screenshots, but keep them truthful and not cluttered.
- Do not mention Android in iOS screenshots or metadata until Android validation is complete.

### Gate 4 — build readiness

Run locally before the release build:

```sh
cd ~/Source/projects/hour-beeper
bun install
bun run typecheck
bun run lint
bun run tests
bun run doctor
bun run check:sounds
```

Also confirm:

- `package.json` version is the desired public version, probably bump from `0.1.0` only if this first release should be `1.0.0`.
- `eas.json` production profile is using an EAS image that satisfies Apple’s current Xcode/iOS SDK upload requirement. If default EAS image lags, pin a compliant image.
- EAS Apple credentials are present and valid for `com.pvinis.hourbeeper`.
- The repo is clean before building if we want the build tag automation in `scripts/build.ts` to create and push `build/ios-prod-<number>`.

### Gate 5 — TestFlight release candidate

Build and submit the release candidate:

```sh
bun build:prod:ios
```

This should:

- run `eas build -e production -p ios --non-interactive --no-wait --json --auto-submit`
- auto-increment the remote iOS build number
- submit the archive to App Store Connect/TestFlight
- tag the git commit if the working tree is clean

After App Store Connect processing:

- Add the build to internal TestFlight.
- Install on at least one physical iPhone from TestFlight, not only a dev/staging build.
- Re-run the critical iOS validation subset:
  - notification permission fresh install
  - hourly/short interval sanity test if available
  - background/locked chime
  - selected sound
  - media continuity spot check
  - notification tap opens app
- If TestFlight reveals issues, fix, bump/build again, and only submit the passing candidate.

### Gate 6 — App Review submission

In App Store Connect:

- Attach the passing build to the iOS version.
- Complete metadata, screenshots, privacy, rating, pricing, review info, and export compliance.
- Submit for review.
- Use manual release for the first version unless we are comfortable with automatic release timing.

Suggested reviewer note:

> Hour Bell is an accountless local-notification utility. Users opt in to notification permission, choose a schedule, and the app schedules local chimes with bundled sounds. No login is required. The notification permission is requested only to deliver the user-configured chimes.

## Risks and mitigations

- **Notification behavior varies by OS state, Focus, silent switch, and user settings.** Mitigate with physical-device validation and conservative copy.
- **App Review may reject unclear notification usage.** Mitigate with permission UX, reviewer notes, and metadata that clearly ties notifications to user-selected chimes.
- **Privacy answers can be wrong if a third-party service collects data.** Mitigate by auditing production SDKs/services before selecting “Data Not Collected.”
- **EAS build image may not satisfy Apple’s 2026 SDK requirement.** Mitigate by checking EAS build logs / image docs and pinning a newer image if needed.
- **Duplicate build/version problems.** Mitigated by `cli.appVersionSource = remote` and `autoIncrement`, but still verify App Store Connect version/build state before submission.
- **Current branch may not be the final release branch.** Merge media-continuity fixes and release from the intended main/release branch.

## Suggested execution order

1. Finish and merge the current media-continuity branch.
2. Run local quality checks.
3. Complete iOS physical-device validation and update validation notes.
4. Prepare Privacy Policy + Support URL.
5. Prepare App Store metadata and screenshots.
6. Confirm EAS credentials and Xcode/iOS SDK compatibility.
7. Run `bun build:prod:ios`.
8. Validate the TestFlight build on a real iPhone.
9. Submit for App Review with conservative reviewer notes.
10. Release manually after approval.
