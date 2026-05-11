import Foundation
import UserNotifications

public struct NotificationRecord: Equatable, Sendable, Identifiable {
    public var id: String { identifier }
    public var identifier: String
    public var soundFilename: String?
    public var soundId: String?
    public var threadIdentifier: String?
    public var source: String?
    public var slotKey: String?
    public var triggerType: String?
    public var trigger: NotificationTriggerSpec
    public var deliveredAt: Date?

    public init(
        identifier: String,
        soundFilename: String?,
        soundId: String?,
        threadIdentifier: String?,
        source: String? = nil,
        slotKey: String?,
        triggerType: String?,
        trigger: NotificationTriggerSpec,
        deliveredAt: Date? = nil
    ) {
        self.identifier = identifier
        self.soundFilename = soundFilename
        self.soundId = soundId
        self.threadIdentifier = threadIdentifier
        self.source = source
        self.slotKey = slotKey
        self.triggerType = triggerType
        self.trigger = trigger
        self.deliveredAt = deliveredAt
    }

    public var isHourBeeperNotification: Bool {
        identifier.hasPrefix(NotificationConstants.identifierPrefix) || source == NotificationConstants.source
    }

    public var fingerprint: String {
        [
            identifier,
            soundFilename ?? "",
            soundId ?? "",
            threadIdentifier ?? "",
            slotKey ?? "",
            triggerType ?? "",
            trigger.fingerprint,
        ].joined(separator: "|")
    }
}

public protocol NotificationCenterClient: Sendable {
    func permissionStatus() async -> ChimePermissionStatus
    func requestPermission() async -> ChimePermissionStatus
    func pendingRequests() async -> [NotificationRecord]
    func deliveredNotifications() async -> [NotificationRecord]
    func add(_ request: NotificationRequestSpec) async throws
    func removePendingRequests(withIdentifiers identifiers: [String]) async
    func removeDeliveredNotifications(withIdentifiers identifiers: [String]) async
}

public struct UserNotificationCenterClient: NotificationCenterClient, @unchecked Sendable {
    private let center: UNUserNotificationCenter

    public init(center: UNUserNotificationCenter = .current()) {
        self.center = center
    }

    public func permissionStatus() async -> ChimePermissionStatus {
        let settings = await center.notificationSettings()
        return ChimePermissionStatus(settings.authorizationStatus)
    }

    public func requestPermission() async -> ChimePermissionStatus {
        do {
            _ = try await center.requestAuthorization(options: [.alert, .sound])
        } catch {
            return .unavailable
        }

        return await permissionStatus()
    }

    public func pendingRequests() async -> [NotificationRecord] {
        await center.pendingNotificationRequests().map(NotificationRecord.init(request:))
    }

    public func deliveredNotifications() async -> [NotificationRecord] {
        await center.deliveredNotifications().map(NotificationRecord.init(notification:))
    }

    public func add(_ request: NotificationRequestSpec) async throws {
        try await center.add(request.makeNotificationRequest())
    }

    public func removePendingRequests(withIdentifiers identifiers: [String]) async {
        center.removePendingNotificationRequests(withIdentifiers: identifiers)
    }

    public func removeDeliveredNotifications(withIdentifiers identifiers: [String]) async {
        center.removeDeliveredNotifications(withIdentifiers: identifiers)
    }
}

extension ChimePermissionStatus {
    public init(_ authorizationStatus: UNAuthorizationStatus) {
        switch authorizationStatus {
        case .notDetermined:
            self = .unknown
        case .denied:
            self = .denied
        case .authorized, .provisional:
            self = .granted
        case .ephemeral:
            self = .granted
        @unknown default:
            self = .unknown
        }
    }
}

extension NotificationRecord {
    init(request: UNNotificationRequest) {
        self.init(
            identifier: request.identifier,
            soundFilename: request.content.userInfo["soundFilename"] as? String,
            soundId: request.content.userInfo["sound"] as? String,
            threadIdentifier: request.content.threadIdentifier.isEmpty ? nil : request.content.threadIdentifier,
            source: request.content.userInfo["source"] as? String,
            slotKey: request.content.userInfo["slotKey"] as? String,
            triggerType: request.content.userInfo["triggerType"] as? String,
            trigger: NotificationTriggerSpec(request.trigger)
        )
    }

    init(notification: UNNotification) {
        self.init(
            identifier: notification.request.identifier,
            soundFilename: notification.request.content.userInfo["soundFilename"] as? String,
            soundId: notification.request.content.userInfo["sound"] as? String,
            threadIdentifier: notification.request.content.threadIdentifier.isEmpty ? nil : notification.request.content.threadIdentifier,
            source: notification.request.content.userInfo["source"] as? String,
            slotKey: notification.request.content.userInfo["slotKey"] as? String,
            triggerType: notification.request.content.userInfo["triggerType"] as? String,
            trigger: NotificationTriggerSpec(notification.request.trigger),
            deliveredAt: notification.date
        )
    }

    public static func fromSpec(_ spec: NotificationRequestSpec) -> NotificationRecord {
        NotificationRecord(
            identifier: spec.identifier,
            soundFilename: spec.soundFilename,
            soundId: spec.sound.rawValue,
            threadIdentifier: spec.threadIdentifier,
            source: NotificationConstants.source,
            slotKey: spec.slotKey,
            triggerType: spec.trigger.triggerType,
            trigger: spec.trigger
        )
    }
}

extension NotificationTriggerSpec {
    init(_ trigger: UNNotificationTrigger?) {
        guard let trigger else {
            self = .unknown(nil)
            return
        }

        if let calendarTrigger = trigger as? UNCalendarNotificationTrigger {
            self = .calendar(
                hour: calendarTrigger.dateComponents.hour,
                minute: calendarTrigger.dateComponents.minute,
                second: calendarTrigger.dateComponents.second
            )
            return
        }

        if let intervalTrigger = trigger as? UNTimeIntervalNotificationTrigger {
            self = .timeInterval(seconds: Int(intervalTrigger.timeInterval))
            return
        }

        self = .unknown(String(describing: type(of: trigger)))
    }
}
