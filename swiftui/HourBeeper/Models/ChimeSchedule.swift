import Foundation

public enum PresetScheduleId: String, CaseIterable, Codable, Identifiable, Sendable {
    case everyMinute = "every-minute"
    case every30Minutes = "every-30-minutes"
    case hourly
    case every2Hours = "every-2-hours"
    case every4Hours = "every-4-hours"

    public var id: String { rawValue }

    public var label: String {
        switch self {
        case .everyMinute: "Every 1 min"
        case .every30Minutes: "Every 30 min"
        case .hourly: "Hourly"
        case .every2Hours: "Every 2 hours"
        case .every4Hours: "Every 4 hours"
        }
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        guard let preset = PresetScheduleId.sanitized(try? container.decode(String.self)) else {
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Unknown preset schedule")
        }
        self = preset
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encode(rawValue)
    }

    public static func sanitized(_ value: Any?) -> PresetScheduleId? {
        guard let rawValue = value as? String else { return nil }

        if rawValue == "every-5-minutes" {
            return .everyMinute
        }

        return PresetScheduleId(rawValue: rawValue)
    }
}

public struct LocalTime: Codable, Equatable, Hashable, Comparable, Sendable, Identifiable {
    public var hour: Int
    public var minute: Int

    public var id: String { key }
    public var key: String { "\(Self.pad(hour)):\(Self.pad(minute))" }

    public init(hour: Int, minute: Int) {
        self.hour = hour
        self.minute = minute
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let hour = try container.decode(Int.self, forKey: .hour)
        let minute = try container.decode(Int.self, forKey: .minute)

        guard (0...23).contains(hour), (0...59).contains(minute) else {
            throw DecodingError.dataCorruptedError(forKey: .hour, in: container, debugDescription: "Invalid local time")
        }

        self.init(hour: hour, minute: minute)
    }

    public static func < (lhs: LocalTime, rhs: LocalTime) -> Bool {
        if lhs.hour != rhs.hour { return lhs.hour < rhs.hour }
        return lhs.minute < rhs.minute
    }

    public static func sanitized(_ value: Any?) -> LocalTime? {
        guard let dictionary = value as? [String: Any] else { return nil }
        guard let hour = dictionary["hour"] as? Int else { return nil }
        guard let minute = dictionary["minute"] as? Int else { return nil }
        guard (0...23).contains(hour), (0...59).contains(minute) else { return nil }
        return LocalTime(hour: hour, minute: minute)
    }

    public static func normalize(_ values: [LocalTime]) -> [LocalTime] {
        Array(Dictionary(grouping: values, by: \.key).compactMap { $0.value.first }).sorted()
    }

    private static func pad(_ value: Int) -> String {
        String(format: "%02d", value)
    }
}

public enum ChimeSchedule: Codable, Equatable, Sendable {
    case preset(PresetScheduleId)
    case custom([LocalTime])

    private enum CodingKeys: String, CodingKey {
        case kind
        case preset
        case times
    }

    public var kind: String {
        switch self {
        case .preset: "preset"
        case .custom: "custom"
        }
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let kind = try container.decode(String.self, forKey: .kind)

        switch kind {
        case "preset":
            let preset = try container.decode(PresetScheduleId.self, forKey: .preset)
            self = .preset(preset)
        case "custom":
            let times = try container.decode([LocalTime].self, forKey: .times)
            let normalized = LocalTime.normalize(times)
            if normalized.isEmpty {
                self = ChimeSettings.default.schedule
            } else {
                self = .custom(normalized)
            }
        default:
            throw DecodingError.dataCorruptedError(forKey: .kind, in: container, debugDescription: "Unknown schedule kind")
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)

        switch self {
        case .preset(let preset):
            try container.encode("preset", forKey: .kind)
            try container.encode(preset, forKey: .preset)
        case .custom(let times):
            try container.encode("custom", forKey: .kind)
            try container.encode(LocalTime.normalize(times), forKey: .times)
        }
    }

    public static func sanitized(_ value: Any?) -> ChimeSchedule {
        guard let dictionary = value as? [String: Any], let kind = dictionary["kind"] as? String else {
            return ChimeSettings.default.schedule
        }

        if kind == "preset" {
            guard let preset = PresetScheduleId.sanitized(dictionary["preset"]) else {
                return ChimeSettings.default.schedule
            }
            return .preset(preset)
        }

        if kind == "custom" {
            let candidateTimes = dictionary["times"] as? [Any] ?? []
            let times = LocalTime.normalize(candidateTimes.compactMap(LocalTime.sanitized))

            if times.isEmpty {
                return ChimeSettings.default.schedule
            }

            return .custom(times)
        }

        return ChimeSettings.default.schedule
    }
}
