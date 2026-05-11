import UserNotifications
import XCTest
@testable import HourBeeper

final class NotificationReconcilerTests: XCTestCase {
    func testReplacesStaleRequestsWhenScheduleOrSoundChanges() async throws {
        let existingSettings = ChimeSettings(enabled: true, schedule: .preset(.hourly), sound: .classic)
        let nextSettings = ChimeSettings(enabled: true, schedule: ScheduleService.createCustomHoursSchedule([11, 16]), sound: .mid)
        let client = FakeNotificationCenterClient(permission: .granted, pending: records(from: NotificationPlanBuilder.buildRequests(settings: existingSettings)))
        let result = try await NotificationReconciler(client: client).reconcile(settings: nextSettings)

        XCTAssertEqual(result.status, "scheduled")
        XCTAssertEqual(result.canceledIds, ["hour-beeper.notification.calendar.minute-00"])
        XCTAssertEqual(client.scheduled.map(\.identifier), [
            "hour-beeper.notification.calendar.11-00",
            "hour-beeper.notification.calendar.16-00",
        ])
        XCTAssertEqual(client.scheduled.map(\.soundFilename), ["digital-beep.wav", "digital-beep.wav"])
    }

    func testDoesNotDuplicateExistingRequestsWhenPlanAlreadyMatches() async throws {
        let settings = ChimeSettings(enabled: true, schedule: .preset(.hourly), sound: .casio)
        let client = FakeNotificationCenterClient(permission: .granted, pending: records(from: NotificationPlanBuilder.buildRequests(settings: settings)))
        let result = try await NotificationReconciler(client: client).reconcile(settings: settings)

        XCTAssertEqual(result.status, "unchanged")
        XCTAssertEqual(result.canceledIds, [])
        XCTAssertEqual(client.scheduled, [])
    }

    func testMigratesLegacyDateRequestsToRepeaters() async throws {
        let settings = ChimeSettings(enabled: true, schedule: .preset(.hourly), sound: .casio)
        let legacy = NotificationRecord(
            identifier: "hour-beeper.notification.legacy.1",
            soundFilename: "casio-beep.wav",
            soundId: "casio",
            threadIdentifier: "hour-beeper.chimes",
            slotKey: "legacy",
            triggerType: "date",
            trigger: .date
        )
        let client = FakeNotificationCenterClient(permission: .granted, pending: [legacy])
        let result = try await NotificationReconciler(client: client).reconcile(settings: settings)

        XCTAssertEqual(result.status, "migrated")
        XCTAssertEqual(result.canceledIds, [legacy.identifier])
        XCTAssertEqual(client.scheduled.map(\.identifier), ["hour-beeper.notification.calendar.minute-00"])
    }

    func testClearsOwnedRequestsWhenDisabled() async throws {
        let existing = records(from: NotificationPlanBuilder.buildRequests(settings: ChimeSettings(enabled: true, schedule: .preset(.hourly), sound: .casio)))
        let client = FakeNotificationCenterClient(permission: .granted, pending: existing)
        let result = try await NotificationReconciler(client: client).reconcile(settings: .default)

        XCTAssertEqual(result.status, "cleared")
        XCTAssertEqual(result.canceledIds, existing.map(\.identifier))
        XCTAssertEqual(client.scheduled, [])
    }

    func testBlockedPermissionClearsOwnedRequests() async throws {
        let existing = records(from: NotificationPlanBuilder.buildRequests(settings: ChimeSettings(enabled: true, schedule: .preset(.hourly), sound: .casio)))
        let client = FakeNotificationCenterClient(permission: .denied, pending: existing)
        let result = try await NotificationReconciler(client: client).reconcile(settings: ChimeSettings(enabled: true, schedule: .preset(.hourly), sound: .casio))

        XCTAssertEqual(result.status, "blocked")
        XCTAssertEqual(result.canceledIds, existing.map(\.identifier))
        XCTAssertEqual(client.scheduled, [])
    }

    func testLeavesForeignNotificationsUntouched() async throws {
        let foreign = NotificationRecord(identifier: "other-app.notification", soundFilename: nil, soundId: nil, threadIdentifier: nil, slotKey: nil, triggerType: nil, trigger: .unknown(nil))
        let client = FakeNotificationCenterClient(permission: .granted, pending: [foreign])
        let result = try await NotificationReconciler(client: client).reconcile(settings: ChimeSettings(enabled: true, schedule: .preset(.hourly), sound: .casio))

        XCTAssertEqual(result.canceledIds, [])
        XCTAssertEqual(client.removedPendingIds, [])
        XCTAssertEqual(client.scheduled.map(\.identifier), ["hour-beeper.notification.calendar.minute-00"])
    }

    func testDismissesOlderDeliveredNotificationsOnly() async {
        let older = NotificationRecord(identifier: "hour-beeper.notification.calendar.11-00", soundFilename: "casio-beep.wav", soundId: "casio", threadIdentifier: "hour-beeper.chimes", slotKey: "11:00", triggerType: "calendar", trigger: .calendar(hour: 11, minute: 0, second: nil), deliveredAt: Date(timeIntervalSince1970: 100))
        let newer = NotificationRecord(identifier: "hour-beeper.notification.calendar.16-00", soundFilename: "casio-beep.wav", soundId: "casio", threadIdentifier: "hour-beeper.chimes", slotKey: "16:00", triggerType: "calendar", trigger: .calendar(hour: 16, minute: 0, second: nil), deliveredAt: Date(timeIntervalSince1970: 200))
        let foreign = NotificationRecord(identifier: "other-app.notification", soundFilename: nil, soundId: nil, threadIdentifier: nil, slotKey: nil, triggerType: nil, trigger: .unknown(nil), deliveredAt: Date(timeIntervalSince1970: 150))
        let client = FakeNotificationCenterClient(permission: .granted, delivered: [newer, foreign, older])

        let dismissed = await NotificationReconciler(client: client).dismissOlderDeliveredHourBeeperNotifications()

        XCTAssertEqual(dismissed, [older.identifier])
        XCTAssertEqual(client.removedDeliveredIds, [older.identifier])
    }

    func testRequestPermissionPathUsesRequestedPermission() async throws {
        let settings = ChimeSettings(enabled: true, schedule: .preset(.hourly), sound: .casio)
        let client = FakeNotificationCenterClient(permission: .unknown, requestedPermission: .granted)
        let result = try await NotificationReconciler(client: client).reconcile(settings: settings, requestPermissionsIfNeeded: true)

        XCTAssertEqual(result.permission, .granted)
        XCTAssertEqual(client.didRequestPermission, true)
        XCTAssertEqual(result.status, "scheduled")
    }

    func testMapsNativeAuthorizationStatuses() {
        XCTAssertEqual(ChimePermissionStatus(UNAuthorizationStatus.notDetermined), .unknown)
        XCTAssertEqual(ChimePermissionStatus(UNAuthorizationStatus.authorized), .granted)
        XCTAssertEqual(ChimePermissionStatus(UNAuthorizationStatus.provisional), .granted)
        XCTAssertEqual(ChimePermissionStatus(UNAuthorizationStatus.ephemeral), .granted)
        XCTAssertEqual(ChimePermissionStatus(UNAuthorizationStatus.denied), .denied)
    }
}

private func records(from specs: [NotificationRequestSpec]) -> [NotificationRecord] {
    specs.map(NotificationRecord.fromSpec)
}

private final class FakeNotificationCenterClient: NotificationCenterClient, @unchecked Sendable {
    var permission: ChimePermissionStatus
    var requestedPermission: ChimePermissionStatus
    var pending: [NotificationRecord]
    var delivered: [NotificationRecord]
    var scheduled: [NotificationRequestSpec] = []
    var removedPendingIds: [String] = []
    var removedDeliveredIds: [String] = []
    var didRequestPermission = false

    init(permission: ChimePermissionStatus, requestedPermission: ChimePermissionStatus? = nil, pending: [NotificationRecord] = [], delivered: [NotificationRecord] = []) {
        self.permission = permission
        self.requestedPermission = requestedPermission ?? permission
        self.pending = pending
        self.delivered = delivered
    }

    func permissionStatus() async -> ChimePermissionStatus { permission }

    func requestPermission() async -> ChimePermissionStatus {
        didRequestPermission = true
        permission = requestedPermission
        return requestedPermission
    }

    func pendingRequests() async -> [NotificationRecord] { pending }

    func deliveredNotifications() async -> [NotificationRecord] { delivered }

    func add(_ request: NotificationRequestSpec) async throws {
        scheduled.append(request)
    }

    func removePendingRequests(withIdentifiers identifiers: [String]) async {
        removedPendingIds.append(contentsOf: identifiers)
        pending.removeAll { identifiers.contains($0.identifier) }
    }

    func removeDeliveredNotifications(withIdentifiers identifiers: [String]) async {
        removedDeliveredIds.append(contentsOf: identifiers)
        delivered.removeAll { identifiers.contains($0.identifier) }
    }
}
