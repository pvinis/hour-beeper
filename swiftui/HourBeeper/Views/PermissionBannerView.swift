import SwiftUI
import UIKit

struct PermissionBannerView: View {
    @EnvironmentObject private var store: SettingsStore

    var body: some View {
        switch store.diagnostics.notificationPermission {
        case .unknown:
            banner(
                title: "Notifications needed",
                message: "Hour Beeper uses local notifications to play chimes while the app is not open.",
                actionTitle: "Allow Notifications",
                action: { store.requestPermission() }
            )
        case .denied:
            banner(
                title: "Notifications are off",
                message: "Enable notifications in Settings to receive chimes.",
                actionTitle: "Open Settings",
                action: openSettings
            )
        case .granted, .unavailable:
            EmptyView()
        }
    }

    private func banner(title: String, message: String, actionTitle: String, action: @escaping () -> Void) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.headline)
            Text(message)
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Button(actionTitle, action: action)
                .buttonStyle(.borderedProminent)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(.yellow.opacity(0.14), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private func openSettings() {
        guard let url = URL(string: UIApplication.openSettingsURLString) else { return }
        UIApplication.shared.open(url)
    }
}
