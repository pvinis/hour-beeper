import SwiftUI

@main
struct HourBeeperApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var settingsStore = SettingsStore()
    @StateObject private var soundPreviewService = SoundPreviewService()

    var body: some Scene {
        WindowGroup {
            HomeView()
                .environmentObject(settingsStore)
                .environmentObject(soundPreviewService)
                .task {
                    settingsStore.reconcile()
                }
                .onChange(of: scenePhase) { _, phase in
                    if phase == .active {
                        settingsStore.reconcile()
                    }
                }
        }
    }
}
