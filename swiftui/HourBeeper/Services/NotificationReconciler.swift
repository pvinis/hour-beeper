import Foundation

public struct NotificationReconciliationResult: Equatable, Sendable {
    public var status: String
    public var permission: ChimePermissionStatus
    public var canceledIds: [String]
    public var scheduledIds: [String]
    public var requestCount: Int

    public init(status: String, permission: ChimePermissionStatus, canceledIds: [String], scheduledIds: [String], requestCount: Int) {
        self.status = status
        self.permission = permission
        self.canceledIds = canceledIds
        self.scheduledIds = scheduledIds
        self.requestCount = requestCount
    }
}

public struct NotificationReconciler: Sendable {
    private let client: NotificationCenterClient

    public init(client: NotificationCenterClient) {
        self.client = client
    }

    public func reconcile(settings: ChimeSettings, requestPermissionsIfNeeded: Bool = false) async throws -> NotificationReconciliationResult {
        try Task.checkCancellation()
        let permission = requestPermissionsIfNeeded ? await client.requestPermission() : await client.permissionStatus()
        try Task.checkCancellation()
        let existing = await client.pendingRequests().filter(\.isHourBeeperNotification)
        try Task.checkCancellation()

        if !settings.enabled {
            let canceledIds = try await cancel(existing)
            return NotificationReconciliationResult(status: "cleared", permission: permission, canceledIds: canceledIds, scheduledIds: [], requestCount: 0)
        }

        if permission != .granted {
            let canceledIds = try await cancel(existing)
            return NotificationReconciliationResult(status: "blocked", permission: permission, canceledIds: canceledIds, scheduledIds: [], requestCount: 0)
        }

        let desired = NotificationPlanBuilder.buildRequests(settings: settings)

        if hasMatchingPlan(existing: existing, desired: desired) {
            return NotificationReconciliationResult(status: "unchanged", permission: permission, canceledIds: [], scheduledIds: [], requestCount: desired.count)
        }

        let didMigrateLegacyRequests = existing.contains { $0.trigger == .date }
        let canceledIds = try await cancel(existing)
        var scheduledIds: [String] = []

        for request in desired {
            try Task.checkCancellation()
            try await client.add(request)
            scheduledIds.append(request.identifier)
        }

        return NotificationReconciliationResult(
            status: didMigrateLegacyRequests ? "migrated" : "scheduled",
            permission: permission,
            canceledIds: canceledIds,
            scheduledIds: scheduledIds,
            requestCount: desired.count
        )
    }

    public func dismissOlderDeliveredHourBeeperNotifications() async -> [String] {
        let delivered = await client.deliveredNotifications()
            .filter(\.isHourBeeperNotification)
            .sorted { left, right in
                let leftDate = left.deliveredAt ?? .distantPast
                let rightDate = right.deliveredAt ?? .distantPast

                if leftDate != rightDate {
                    return leftDate < rightDate
                }

                if (left.slotKey ?? "") != (right.slotKey ?? "") {
                    return (left.slotKey ?? "") < (right.slotKey ?? "")
                }

                return left.identifier < right.identifier
            }

        guard delivered.count > 1 else { return [] }

        let dismissIds = delivered.dropLast().map(\.identifier)
        await client.removeDeliveredNotifications(withIdentifiers: dismissIds)
        return dismissIds
    }

    private func hasMatchingPlan(existing: [NotificationRecord], desired: [NotificationRequestSpec]) -> Bool {
        guard existing.count == desired.count else { return false }
        let existingFingerprints = Set(existing.map(\.fingerprint))
        guard existingFingerprints.count == desired.count else { return false }
        return desired.allSatisfy { existingFingerprints.contains($0.fingerprint) }
    }

    private func cancel(_ records: [NotificationRecord]) async throws -> [String] {
        try Task.checkCancellation()
        let identifiers = records.map(\.identifier)
        await client.removePendingRequests(withIdentifiers: identifiers)
        try Task.checkCancellation()
        return identifiers
    }
}
