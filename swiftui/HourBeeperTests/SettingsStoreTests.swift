import XCTest
@testable import HourBeeper

@MainActor
final class SettingsStoreTests: XCTestCase {
    func testSettingsEncodeAndReloadFromUserDefaultsShape() throws {
        let suiteName = "HourBeeperSettingsStoreTests-\(UUID().uuidString)"
        let defaults = try XCTUnwrap(UserDefaults(suiteName: suiteName))
        defer { defaults.removePersistentDomain(forName: suiteName) }

        let settings = ChimeSettings(enabled: true, schedule: ScheduleService.createCustomHoursSchedule([11, 16]), sound: .mid)
        let data = try JSONEncoder.hourBeeper.encode(settings)
        defaults.set(data, forKey: "hour-beeper.swiftui.chime-settings")

        let store = SettingsStore(userDefaults: defaults, reconciler: NotificationReconciler(client: NoopNotificationCenterClient()))

        XCTAssertEqual(store.settings, settings)
    }

    func testLoadMigratesLegacyPersistedIds() throws {
        let defaults = try makeDefaults()
        defaults.set(#"{"enabled":true,"schedule":{"kind":"preset","preset":"every-5-minutes"},"sound":"digital"}"#.data(using: .utf8), forKey: "hour-beeper.swiftui.chime-settings")

        let store = SettingsStore(userDefaults: defaults, reconciler: NotificationReconciler(client: NoopNotificationCenterClient()))

        XCTAssertEqual(store.settings.enabled, true)
        XCTAssertEqual(store.settings.schedule, .preset(.everyMinute))
        XCTAssertEqual(store.settings.sound, .mid)
    }

    func testLoadFallsBackForInvalidCustomTimes() throws {
        let defaults = try makeDefaults()
        defaults.set(#"{"enabled":true,"schedule":{"kind":"custom","times":[{"hour":99,"minute":0}]},"sound":"casio"}"#.data(using: .utf8), forKey: "hour-beeper.swiftui.chime-settings")

        let store = SettingsStore(userDefaults: defaults, reconciler: NotificationReconciler(client: NoopNotificationCenterClient()))

        XCTAssertEqual(store.settings.enabled, true)
        XCTAssertEqual(store.settings.schedule, .preset(.hourly))
        XCTAssertEqual(store.settings.sound, .casio)
    }

    private func makeDefaults() throws -> UserDefaults {
        let suiteName = "HourBeeperSettingsStoreTests-\(UUID().uuidString)"
        let defaults = try XCTUnwrap(UserDefaults(suiteName: suiteName))
        defaults.removePersistentDomain(forName: suiteName)
        return defaults
    }
}

private struct NoopNotificationCenterClient: NotificationCenterClient {
    func permissionStatus() async -> ChimePermissionStatus { .unknown }
    func requestPermission() async -> ChimePermissionStatus { .unknown }
    func pendingRequests() async -> [NotificationRecord] { [] }
    func deliveredNotifications() async -> [NotificationRecord] { [] }
    func add(_ request: NotificationRequestSpec) async throws {}
    func removePendingRequests(withIdentifiers identifiers: [String]) async {}
    func removeDeliveredNotifications(withIdentifiers identifiers: [String]) async {}
}
