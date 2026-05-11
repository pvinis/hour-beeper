import UIKit

final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        NotificationDelegate.shared.install()
        return true
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        NotificationDelegate.shared.cleanupDeliveredNotifications()
    }
}
