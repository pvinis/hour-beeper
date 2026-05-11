import Foundation
import UIKit
import UserNotifications

public final class NotificationDelegate: NSObject, UNUserNotificationCenterDelegate, @unchecked Sendable {
    nonisolated(unsafe) public static let shared = NotificationDelegate()

    private let reconciler = NotificationReconciler(client: UserNotificationCenterClient())

    private override init() {
        super.init()
    }

    public func install() {
        UNUserNotificationCenter.current().delegate = self
    }

    public func cleanupDeliveredNotifications() {
        Task {
            _ = await reconciler.dismissOlderDeliveredHourBeeperNotifications()
        }
    }

    public func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        cleanupDeliveredNotifications()
        return [.sound]
    }

    public func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse
    ) async {
        cleanupDeliveredNotifications()
    }
}
