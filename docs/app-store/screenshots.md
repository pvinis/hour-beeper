# Hour Bell App Store Screenshots

Last updated: 2026-05-13

## Style decision

Use polished framed screenshots with short captions. The app UI is intentionally simple, so captions help explain why the app exists without making the screenshots feel empty.

## Screenshot story

Create 4 screenshots for the first release:

1. **A tiny time ritual**
   - Screen: main app with chimes enabled.
   - Caption: `A tiny time ritual`
   - Subcaption: `Like an old Casio hourly beep — gentler and always with you.`

2. **Pick your rhythm**
   - Screen: schedule/rhythm options.
   - Caption: `Pick your rhythm`
   - Subcaption: `Hourly, every 30 minutes, every few hours, or custom times.`

3. **Choose your sound**
   - Screen: sound picker.
   - Caption: `Choose your sound`
   - Subcaption: `Preview bundled bells before you set them.`

4. **Aware, not distracted**
   - Screen: permission/diagnostics/settings state, or main screen if cleaner.
   - Caption: `Aware, not distracted`
   - Subcaption: `No account, no streaks, no dashboard, no clutter.`

Optional fifth screenshot:

5. **Stays out of the way**
   - Screen: enabled summary/diagnostics.
   - Caption: `Stays out of the way`
   - Subcaption: `Your iPhone settings stay in control of notifications.`

## Claims to avoid

Do not claim:

- “always rings”
- “works even in silent mode”
- “bypasses Focus”
- “guaranteed every hour”
- “never interrupts music” unless final physical validation proves the exact path being shown

Prefer:

- “scheduled local chimes”
- “gentle recurring chimes”
- “device settings stay in control”
- “designed to be simple and local”

## Capture checklist

- [ ] Use production app name/icon if possible.
- [ ] Use realistic, non-debug app state.
- [ ] Hide development overlays.
- [ ] Use a clean status bar.
- [ ] Keep copy large enough to read in App Store search/listing contexts.
- [ ] Export PNG/JPG under Apple’s size limits.
- [ ] Upload at least the required iPhone display sizes accepted by App Store Connect.

## Possible creation tools

- Figma with an App Store screenshot template
- Pixelmator/Sketch/Canva for manual framed assets
- `xcrun simctl io booted screenshot` for raw capture
- Fastlane Snapshot later if we want repeatable automated screenshots
