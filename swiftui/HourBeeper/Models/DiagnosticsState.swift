import Foundation

public struct DiagnosticsHistoryEntry: Codable, Equatable, Identifiable, Sendable {
    public var id: String { "\(timestamp.timeIntervalSince1970)-\(status)" }
    public var timestamp: Date
    public var status: String
    public var artifactCount: Int?

    public init(timestamp: Date, status: String, artifactCount: Int?) {
        self.timestamp = timestamp
        self.status = status
        self.artifactCount = artifactCount
    }
}

public struct DiagnosticsState: Codable, Equatable, Sendable {
    public var notificationPermission: ChimePermissionStatus
    public var lastReconciledAt: Date?
    public var lastScheduledArtifactCount: Int?
    public var lastError: String?
    public var history: [DiagnosticsHistoryEntry]

    public init(
        notificationPermission: ChimePermissionStatus,
        lastReconciledAt: Date?,
        lastScheduledArtifactCount: Int?,
        lastError: String?,
        history: [DiagnosticsHistoryEntry]
    ) {
        self.notificationPermission = notificationPermission
        self.lastReconciledAt = lastReconciledAt
        self.lastScheduledArtifactCount = lastScheduledArtifactCount
        self.lastError = lastError
        self.history = history
    }

    public static let `default` = DiagnosticsState(
        notificationPermission: .unknown,
        lastReconciledAt: nil,
        lastScheduledArtifactCount: nil,
        lastError: nil,
        history: []
    )

    public func recording(
        status: String,
        artifactCount: Int?,
        notificationPermission: ChimePermissionStatus? = nil,
        error: String? = nil,
        now: Date = Date()
    ) -> DiagnosticsState {
        let entry = DiagnosticsHistoryEntry(timestamp: now, status: status, artifactCount: artifactCount)

        return DiagnosticsState(
            notificationPermission: notificationPermission ?? self.notificationPermission,
            lastReconciledAt: now,
            lastScheduledArtifactCount: artifactCount,
            lastError: error,
            history: Array(([entry] + history).prefix(50))
        )
    }

    public static func formatReconciliationStatus(_ status: String) -> String {
        switch status {
        case "migrated": "migrated to repeaters"
        case "scheduled": "scheduled"
        case "unchanged": "unchanged"
        case "blocked": "blocked"
        case "cleared": "cleared"
        case "error": "error"
        default: status
        }
    }

    public static func formatRepeaterCount(_ count: Int?) -> String {
        guard let count else { return "—" }
        return "\(count) \(count == 1 ? "repeater" : "repeaters")"
    }
}
