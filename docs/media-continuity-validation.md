# Media Continuity Validation

Use this checklist for GitHub issue #7 before claiming Hour Bell preserves other audio during chimes. Test on physical devices; simulators are not reliable for notification audio, silent mode, Bluetooth routing, or Android channel behavior.

## Expected behavior by sound path

| Sound path | Owner | Expected behavior |
| --- | --- | --- |
| Foreground preview | Hour Bell via `expo-audio` | Beep is audible; existing media continues without pausing. |
| Foreground scheduled chime | Hour Bell via app-owned playback when metadata/playback are ready | Beep is audible; existing media continues without pausing. |
| iOS background/locked/terminated scheduled chime | iOS local notification sound | Record observed behavior. The app does not claim AVAudioSession control over this OS-owned path. |
| Android background/locked/terminated scheduled chime | Android notification channel | Record observed behavior for fresh installs and upgrades because channels are user/system-owned. |

## iOS matrix

Record device model, iOS version, audio route, Hour Bell build, and selected sound for each pass.

| Media app | App state | Silent switch / Focus | Expected | Observed | Pass? | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Apple Music | Foreground preview | Normal | Media continues; beep audible |  |  |  |
| Apple Music | Foreground scheduled chime | Normal | Media continues; beep audible |  |  |  |
| Apple Music | Background scheduled chime | Normal | Record OS notification behavior |  |  |  |
| Apple Music | Locked scheduled chime | Normal | Record OS notification behavior |  |  |  |
| Apple Music | Terminated scheduled chime | Normal | Record OS notification behavior |  |  |  |
| Podcasts | Foreground preview | Normal | Media continues; beep audible |  |  |  |
| Podcasts | Foreground scheduled chime | Normal | Media continues; beep audible |  |  |  |
| Podcasts | Background scheduled chime | Normal | Record OS notification behavior |  |  |  |
| Podcasts | Locked scheduled chime | Normal | Record OS notification behavior |  |  |  |
| Podcasts | Terminated scheduled chime | Normal | Record OS notification behavior |  |  |  |
| Spotify | Foreground preview | Normal | Media continues; beep audible |  |  |  |
| Spotify | Foreground scheduled chime | Normal | Media continues; beep audible |  |  |  |
| Spotify | Background scheduled chime | Normal | Record OS notification behavior |  |  |  |
| Spotify | Locked scheduled chime | Normal | Record OS notification behavior |  |  |  |
| Spotify | Terminated scheduled chime | Normal | Record OS notification behavior |  |  |  |
| Any available media app | Foreground preview | Silent switch on | Record app-owned silent-mode behavior |  |  |  |
| Any available media app | Foreground scheduled chime | Silent switch on | Record app-owned scheduled-chime behavior |  |  |  |
| Any available media app | Background scheduled chime | Silent switch on / Focus on | Record OS notification behavior |  |  |  |

## Android matrix

Record device model, Android version, OEM skin, audio route, Hour Bell build, selected sound, and whether this is a fresh install or upgrade with pre-existing channels. This build uses versioned sound channel IDs for the audio-attribute change, so upgraded installs should schedule new chimes through the new channels while old channels may remain visible in Android settings.

| Media app | Install/channel state | App state | Expected | Observed | Pass? | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Available music app | Fresh install | Foreground preview | Media continues; beep audible |  |  |  |
| Available music app | Fresh install | Foreground scheduled chime | Media continues; beep audible |  |  |  |
| Available music app | Fresh install | Background scheduled chime | Record channel behavior |  |  |  |
| Available music app | Fresh install | Locked scheduled chime | Record channel behavior |  |  |  |
| Available music app | Fresh install | Terminated scheduled chime | Record channel behavior |  |  |  |
| Available music app | Existing pre-attribute channel | Background scheduled chime | Record whether old channel behavior persists |  |  |  |
| Available music app | Existing pre-attribute channel | Locked scheduled chime | Record whether old channel behavior persists |  |  |  |
| Available music app | User-muted channel | Any scheduled state | App should not silently claim healthy audible delivery |  |  |  |

## Decision log

After validation, summarize the decision for issue #7:

- **Foreground app-owned audio:** pass/fail and any follow-up needed.
- **iOS OS-owned notification audio:** observed behavior and whether it is acceptable for the product.
- **Android channel audio:** observed fresh-install behavior, observed upgrade behavior, whether new versioned channels are used, and whether any old channels need user-facing cleanup guidance.
- **Ducking comparison:** only record if `duckOthers` was tested as an alternative to `mixWithOthers`.
