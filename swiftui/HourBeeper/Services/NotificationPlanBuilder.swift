import Foundation
import UserNotifications

public enum NotificationConstants {
    public static let identifierPrefix = "hour-beeper.notification"
    public static let source = "hour-beeper"
    public static let threadIdentifier = "hour-beeper.chimes"
    public static let repeatingIntervalSeconds = 60
}

public enum NotificationTriggerSpec: Equatable, Sendable {
    case calendar(hour: Int?, minute: Int?, second: Int?)
    case timeInterval(seconds: Int)
    case date
    case unknown(String?)

    public var triggerType: String {
        switch self {
        case .calendar: "calendar"
        case .timeInterval: "timeInterval"
        case .date: "date"
        case .unknown: "unknown"
        }
    }

    public var fingerprint: String {
        switch self {
        case .calendar(let hour, let minute, let second):
            return ["calendar", "repeat", hour.map(String.init) ?? "*", minute.map(String.init) ?? "*", second.map(String.init) ?? "*", "local"].joined(separator: ":")
        case .timeInterval(let seconds):
            return ["timeInterval", "repeat", String(seconds)].joined(separator: ":")
        case .date:
            return "date:stale"
        case .unknown(let rawType):
            return "unknown:\(rawType ?? "unknown")"
        }
    }
}

public struct NotificationRequestSpec: Equatable, Sendable, Identifiable {
    public var id: String { identifier }
    public var identifier: String
    public var slotKey: String
    public var body: String
    public var trigger: NotificationTriggerSpec
    public var sound: ChimeSound
    public var soundFilename: String
    public var threadIdentifier: String

    public init(identifier: String, slotKey: String, body: String, trigger: NotificationTriggerSpec, sound: ChimeSound, soundFilename: String, threadIdentifier: String = NotificationConstants.threadIdentifier) {
        self.identifier = identifier
        self.slotKey = slotKey
        self.body = body
        self.trigger = trigger
        self.sound = sound
        self.soundFilename = soundFilename
        self.threadIdentifier = threadIdentifier
    }

    public var userInfo: [String: String] {
        [
            "source": NotificationConstants.source,
            "slotKey": slotKey,
            "triggerType": trigger.triggerType,
            "sound": sound.rawValue,
            "soundFilename": soundFilename,
        ]
    }

    public var fingerprint: String {
        [
            identifier,
            soundFilename,
            sound.rawValue,
            threadIdentifier,
            slotKey,
            trigger.triggerType,
            trigger.fingerprint,
        ].joined(separator: "|")
    }

    public func makeNotificationRequest() -> UNNotificationRequest {
        let content = UNMutableNotificationContent()
        content.title = "Hour Beeper"
        content.body = body
        content.sound = UNNotificationSound(named: UNNotificationSoundName(soundFilename))
        content.userInfo = userInfo
        content.threadIdentifier = threadIdentifier
        content.interruptionLevel = .active

        return UNNotificationRequest(identifier: identifier, content: content, trigger: makeTrigger())
    }

    private func makeTrigger() -> UNNotificationTrigger {
        switch trigger {
        case .calendar(let hour, let minute, let second):
            var components = DateComponents()
            components.calendar = Calendar.current
            components.hour = hour
            components.minute = minute
            components.second = second
            return UNCalendarNotificationTrigger(dateMatching: components, repeats: true)
        case .timeInterval(let seconds):
            return UNTimeIntervalNotificationTrigger(timeInterval: TimeInterval(seconds), repeats: true)
        case .date, .unknown:
            return UNTimeIntervalNotificationTrigger(timeInterval: TimeInterval(NotificationConstants.repeatingIntervalSeconds), repeats: true)
        }
    }
}

public enum NotificationPlanBuilder {
    public static func buildRequests(settings: ChimeSettings) -> [NotificationRequestSpec] {
        guard settings.enabled else { return [] }

        return notificationSlots(for: settings).map { slot in
            NotificationRequestSpec(
                identifier: createNotificationIdentifier(slot: slot),
                slotKey: slot.slotKey,
                body: slot.body,
                trigger: slot.trigger,
                sound: settings.sound,
                soundFilename: settings.sound.notificationFilename
            )
        }
    }

    private struct NotificationSlot {
        var slotKey: String
        var body: String
        var trigger: NotificationTriggerSpec
    }

    private static func notificationSlots(for settings: ChimeSettings) -> [NotificationSlot] {
        if case .preset(let preset) = settings.schedule {
            switch preset {
            case .everyMinute:
                return [NotificationSlot(
                    slotKey: "interval:\(NotificationConstants.repeatingIntervalSeconds)s",
                    body: "Chime every minute",
                    trigger: .timeInterval(seconds: NotificationConstants.repeatingIntervalSeconds)
                )]
            case .hourly:
                return [createMinuteOnlySlot(minute: 0)]
            case .every30Minutes:
                return [createMinuteOnlySlot(minute: 0), createMinuteOnlySlot(minute: 30)]
            case .every2Hours, .every4Hours:
                break
            }
        }

        return ScheduleService.scheduleTimes(for: settings.schedule).map(createLocalTimeSlot)
    }

    private static func createMinuteOnlySlot(minute: Int) -> NotificationSlot {
        NotificationSlot(
            slotKey: "minute:\(pad(minute))",
            body: "Chime for :\(pad(minute))",
            trigger: .calendar(hour: nil, minute: minute, second: nil)
        )
    }

    private static func createLocalTimeSlot(_ localTime: LocalTime) -> NotificationSlot {
        NotificationSlot(
            slotKey: localTime.key,
            body: "Chime for \(localTime.key)",
            trigger: .calendar(hour: localTime.hour, minute: localTime.minute, second: nil)
        )
    }

    private static func createNotificationIdentifier(slot: NotificationSlot) -> String {
        "\(NotificationConstants.identifierPrefix).\(slot.trigger.triggerType).\(normalizeIdentifierSegment(slot.slotKey))"
    }

    private static func normalizeIdentifierSegment(_ value: String) -> String {
        value.replacingOccurrences(of: ":", with: "-")
    }

    private static func pad(_ value: Int) -> String {
        String(format: "%02d", value)
    }
}
