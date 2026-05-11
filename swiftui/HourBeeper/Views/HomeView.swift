import SwiftUI

struct HomeView: View {
    @EnvironmentObject private var store: SettingsStore

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    header
                    enabledCard
                    PermissionBannerView()

                    if store.settings.enabled {
                        ScheduleSectionView()
                        SoundSectionView()
                    } else {
                        Text("Enable chimes to configure your schedule and sound.")
                            .foregroundStyle(.secondary)
                            .frame(maxWidth: .infinity)
                            .multilineTextAlignment(.center)
                            .padding(.vertical, 48)
                    }

                    DiagnosticsSectionView()
                }
                .padding()
            }
            .navigationTitle("Hour Beeper")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Hour Beeper")
                .font(.largeTitle.bold())
            Text("A brief recurring beep at the times you choose.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }

    private var enabledCard: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Chimes \(store.settings.enabled ? "On" : "Off")")
                    .font(.headline)
                Text(statusSummary)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            Toggle("Chimes", isOn: Binding(
                get: { store.settings.enabled },
                set: { store.setEnabled($0) }
            ))
            .labelsHidden()
        }
        .padding()
        .background(.background.secondary, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private var statusSummary: String {
        guard store.settings.enabled else {
            return "No chimes scheduled."
        }

        let scheduleLabel: String
        switch store.settings.schedule {
        case .preset(let preset):
            scheduleLabel = preset.rawValue.replacingOccurrences(of: "-", with: " ")
        case .custom:
            scheduleLabel = "custom hours"
        }

        let syncing = store.isReconciling ? " · syncing…" : ""
        return "\(scheduleLabel) · \(store.settings.sound.rawValue)\(syncing)"
    }
}

#Preview {
    HomeView()
        .environmentObject(SettingsStore(userDefaults: .standard))
        .environmentObject(SoundPreviewService())
}
