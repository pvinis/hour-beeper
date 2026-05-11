# Hour Beeper SwiftUI

Native SwiftUI prototype of Hour Beeper. The existing Expo app remains at the repository root; this app is isolated under `swiftui/`.

## Build

Open `HourBeeper.xcodeproj` in Xcode and run the shared `HourBeeper` scheme, or use:

```sh
xcodebuild -project HourBeeper.xcodeproj -scheme HourBeeper -destination 'platform=iOS Simulator,name=iPhone 17' build
```

## Test

```sh
xcodebuild -project HourBeeper.xcodeproj -scheme HourBeeper -destination 'platform=iOS Simulator,name=iPhone 17' test
```

## Device validation

Simulator testing is useful for UI and pending notification inspection. Physical-device testing is still required for closed-app delivery, custom notification sounds, Silent Mode / Focus behavior, reboot/relaunch behavior, timezone and DST changes, and Notification Center cleanup behavior.
