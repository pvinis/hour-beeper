---
title: Prepare App Store Metadata for Hour Bell
date: 2026-05-13
status: active
---

# Prepare App Store Metadata for Hour Bell

## Goal

Complete the App Store Connect non-code release requirements for `Hour Bell`: privacy policy, support URL, metadata copy, screenshots, age rating, privacy nutrition label, pricing, and reviewer notes.

This is the “step 2” work from the iOS release plan.

## What we need in App Store Connect

Apple requires or commonly expects these before review:

- App name / subtitle
- App description
- Keywords
- Category
- Age rating questionnaire
- Privacy Policy URL
- Support URL
- App Privacy answers / nutrition label
- Screenshots, 1–10 per required device size
- Pricing and availability
- Review contact info
- Reviewer notes
- Build-specific release notes / “What’s New”

Sources checked:

- App information reference: https://developer.apple.com/help/app-store-connect/reference/app-information/app-information
- Required/localizable/editable properties: https://developer.apple.com/help/app-store-connect/reference/app-information/required-localizable-and-editable-properties/
- App privacy: https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/
- Screenshot specs: https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications

## Recommended tooling/options

### 1. Privacy Policy + Support URL

Best simple option: add two static pages somewhere you control.

Recommended URLs:

- `https://pvinis.com/hour-bell/privacy`
- `https://pvinis.com/hour-bell/support`

Alternatives:

- GitHub Pages from this repo or a tiny `hour-bell-site` repo
- Existing personal website route if `pvinis.com` is easy to edit
- Notion/Super/etc. temporarily, but less polished and more fragile

Privacy policy should be simple and truthful. If the app really has no analytics, accounts, backend, ads, tracking, crash reporting, or third-party data collection, the policy can say:

- Hour Bell does not collect personal data.
- Settings are stored locally on-device.
- The app uses local notifications only after permission is granted.
- Notification schedules/sound choices stay on the device.
- Contact email for privacy/support.

Need to verify before publishing:

- No analytics SDK.
- No crash reporting SDK.
- No remote backend.
- No ad/tracking SDK.
- No push-notification server. Current app uses local notifications, not server push.

### 2. Screenshots

Best option for a clean first release: use the iOS Simulator + simple designed frames.

Capture options:

- Free/manual:
  - Run production-ish build in Simulator.
  - Capture with `xcrun simctl io booted screenshot` or Cmd+S in Simulator.
  - Compose final images in Figma, Sketch, Pixelmator, or Canva.
- More automated:
  - `fastlane snapshot` if we want repeatable screenshot capture later.
- Polished commercial tools:
  - AppLaunchpad, ScreenshotOne, Rotato, Screenshots Pro, AppMockUp, or Figma templates.

For this app, framed screenshots are useful because the UI is simple. Suggested set:

1. “Hourly chimes, your way” — main screen with chimes enabled.
2. “Pick the rhythm” — schedule options.
3. “Choose your bell” — sound picker / preview.
4. “Quietly local” — privacy/local-only positioning, maybe no data/account message.
5. Optional: diagnostics/permission state if it helps reviewer/user trust.

Avoid claims that iOS cannot guarantee, like “always rings no matter what.” Use softer copy: “scheduled local chimes,” “gentle reminders,” “opt-in notifications.”

### 3. Metadata copy

We can draft directly in a markdown file first, then paste into App Store Connect.

Fields to prepare:

- Name: `Hour Bell - Hourly Chime` or keep existing ASC name.
- Subtitle: <= 30 chars. Candidate: `Gentle hourly chimes`.
- Promotional text: optional, editable anytime.
- Description.
- Keywords: <= 100 chars total.
- What’s New: for first version, simple launch note.

Suggested positioning:

- Minimal, calm, local hourly chime app.
- Good for time awareness, focus, routines, breaks, analog watch nostalgia.
- No account, no feeds, no clutter.

### 4. Privacy nutrition label

Likely answer, if verification passes: **Data Not Collected**.

Reasoning:

- The app appears accountless.
- No backend in current dependencies.
- No ads/analytics SDKs in `package.json`.
- Settings appear local (`expo-sqlite`, local storage atoms).
- Local notifications are user-configured and local-device behavior, not data collection by themselves.

Caution: App Privacy answers must include third-party partners’ data practices. Before selecting “Data Not Collected,” verify no production service collects diagnostics or identifiers.

### 5. Category / rating / pricing

Recommended defaults:

- Primary category: `Utilities` or `Productivity`.
  - `Utilities` feels safest for a small chime tool.
  - `Productivity` may be better if copy emphasizes focus/routines.
- Age rating: likely 4+, assuming no user-generated content, web access, commerce, medical claims, etc.
- Price: free for first release unless there is a monetization plan.
- Availability: start with desired countries; global is fine if privacy/support copy is English-only but acceptable.

### 6. Reviewer notes

Prepare this note:

> Hour Bell is an accountless local-notification utility. Users opt in to notification permission, choose a schedule, and the app schedules local chimes with bundled sounds. No login is required. The notification permission is requested only to deliver the user-configured chimes. Settings are stored locally on device.

## Draft metadata

### Name

Hour Bell - Hourly Chime

### Subtitle candidates

- Gentle hourly chimes
- Simple hourly reminders
- A calm hourly bell
- Time-awareness chimes

Recommended: `Gentle hourly chimes`

### Keywords candidates

Need <= 100 chars total. Candidate:

`hourly,chime,bell,reminder,time,focus,routine,break,timer,watch,notification`

Length: 76 chars.

### Promotional text candidate

A simple hourly bell for time awareness, focus, routines, and breaks — with no account and no clutter.

### Description draft

Hour Bell is a minimal app for gentle recurring chimes.

Choose a rhythm, pick a sound, and let your iPhone mark the time with a small bell — inspired by classic digital watch hourly chimes.

Use it for:

- noticing the passing hour
- focus sessions and breaks
- daily routines
- a calm, low-friction time cue
- nostalgic hourly watch-style beeps

Hour Bell is intentionally simple:

- no account
- no feed
- no ads
- no cloud setup
- local settings on your device
- opt-in notification permission only for scheduled chimes

Chime delivery depends on iOS notification settings, Focus modes, silent mode, and device volume. Hour Bell gives you a simple way to configure local chimes; your device settings stay in control.

### What’s New draft

Hour Bell is now available on iPhone. Set up gentle recurring chimes, choose your sound, and keep a quiet sense of time throughout the day.

## Concrete task plan

### Phase 1 — verify facts

- [ ] Audit app dependencies and code for analytics, tracking, crash reporting, remote APIs, and accounts.
- [ ] Confirm whether any EAS/Expo production service changes App Privacy answers. Build tooling does not usually count as app data collection, but embedded runtime SDK behavior does.
- [ ] Confirm final support contact email.
- [ ] Confirm whether `pvinis.com` can host support/privacy pages.

### Phase 2 — create public pages

- [ ] Create Privacy Policy page.
- [ ] Create Support page.
- [ ] Include app name, contact email, and last updated date.
- [ ] Publish pages over HTTPS.
- [ ] Check links on phone and desktop.

### Phase 3 — finalize metadata copy

- [ ] Choose subtitle.
- [ ] Finalize description.
- [ ] Finalize keywords within 100 characters.
- [ ] Choose category.
- [ ] Fill age rating questionnaire.
- [ ] Prepare reviewer notes.

### Phase 4 — create screenshots

- [ ] Decide screenshot story: 3–5 screens.
- [ ] Capture simulator screenshots from a clean, production-looking build.
- [ ] Create framed App Store images at required dimensions.
- [ ] Export PNG/JPG under 10MB each.
- [ ] Upload to App Store Connect and confirm no size errors.

### Phase 5 — enter App Store Connect fields

- [ ] Privacy Policy URL.
- [ ] Support URL.
- [ ] App Privacy: likely Data Not Collected, if Phase 1 confirms.
- [ ] Description/subtitle/keywords/promotional text.
- [ ] Screenshots.
- [ ] Age rating.
- [ ] Pricing/availability.
- [ ] Reviewer notes.

## Open decisions for you

1. Where should the Privacy Policy and Support pages live?
   - Recommended: `pvinis.com/hour-bell/privacy` and `/support`.
2. What support email should we publish?
3. Do you want the first release to feel more like:
   - `Utilities`: simple tool, plain and trustworthy
   - `Productivity`: focus/routine helper
4. Screenshots style:
   - plain device screenshots
   - polished framed screenshots with marketing captions

## Recommended next step

Start with the privacy/support pages because App Store Connect blocks submission without them. Then draft metadata copy and screenshots in parallel.
