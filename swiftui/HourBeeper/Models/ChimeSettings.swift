import Foundation

public enum ChimePermissionStatus: String, Codable, Equatable, Sendable {
    case unknown
    case granted
    case denied
    case unavailable
}

public struct ChimeSettings: Codable, Equatable, Sendable {
    public var enabled: Bool
    public var schedule: ChimeSchedule
    public var sound: ChimeSound

    private enum CodingKeys: String, CodingKey {
        case enabled
        case schedule
        case sound
    }

    public init(enabled: Bool, schedule: ChimeSchedule, sound: ChimeSound) {
        self.enabled = enabled
        self.schedule = schedule
        self.sound = sound
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.init(
            enabled: (try? container.decode(Bool.self, forKey: .enabled)) ?? ChimeSettings.default.enabled,
            schedule: (try? container.decode(ChimeSchedule.self, forKey: .schedule)) ?? ChimeSettings.default.schedule,
            sound: (try? container.decode(ChimeSound.self, forKey: .sound)) ?? ChimeSettings.default.sound
        )
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(enabled, forKey: .enabled)
        try container.encode(schedule, forKey: .schedule)
        try container.encode(sound, forKey: .sound)
    }

    public static let `default` = ChimeSettings(
        enabled: false,
        schedule: .preset(.hourly),
        sound: .casio
    )

    public static func sanitized(_ value: Any?) -> ChimeSettings {
        guard let dictionary = value as? [String: Any] else {
            return .default
        }

        return ChimeSettings(
            enabled: dictionary["enabled"] as? Bool ?? ChimeSettings.default.enabled,
            schedule: ChimeSchedule.sanitized(dictionary["schedule"]),
            sound: ChimeSound.sanitized(dictionary["sound"])
        )
    }
}

public struct MaterializedChimeOccurrence: Equatable, Identifiable, Sendable {
    public var id: String
    public var occursAt: Date
    public var localTime: LocalTime

    public init(id: String, occursAt: Date, localTime: LocalTime) {
        self.id = id
        self.occursAt = occursAt
        self.localTime = localTime
    }
}
