import Foundation

public enum ChimeSound: String, CaseIterable, Codable, Identifiable, Sendable {
    case casio
    case mid
    case classic
    case low

    public var id: String { rawValue }

    public var label: String {
        switch self {
        case .casio: "Casio"
        case .mid: "Mid"
        case .classic: "Classic"
        case .low: "Low"
        }
    }

    public var notificationFilename: String {
        switch self {
        case .casio: "casio-beep.wav"
        case .mid: "digital-beep.wav"
        case .classic: "classic-beep.wav"
        case .low: "soft-beep.wav"
        }
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        self = ChimeSound.sanitized(try? container.decode(String.self))
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encode(rawValue)
    }

    public static func sanitized(_ value: Any?) -> ChimeSound {
        if let value = value as? String {
            switch value {
            case "digital": return .mid
            case "soft": return .low
            default: return ChimeSound(rawValue: value) ?? ChimeSettings.default.sound
            }
        }

        return ChimeSettings.default.sound
    }
}
