import SwiftUI

struct DiagnosticsSectionView: View {
    @EnvironmentObject private var store: SettingsStore
    @State private var expanded = false

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Button {
                expanded.toggle()
            } label: {
                Text("Diagnostics \(expanded ? "▼" : "▶")")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                    .textCase(.uppercase)
            }
            .buttonStyle(.plain)

            VStack(spacing: 8) {
                diagnosticRow(label: "Notification permission", value: permissionLabel)
                diagnosticRow(label: "Last reconciled", value: lastReconciledLabel)
                diagnosticRow(label: "Scheduled repeaters", value: DiagnosticsState.formatRepeaterCount(store.diagnostics.lastScheduledArtifactCount))

                if let error = store.diagnostics.lastError {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.red)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(8)
                        .background(.red.opacity(0.10), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                }
            }
            .padding()
            .background(.background.secondary, in: RoundedRectangle(cornerRadius: 16, style: .continuous))

            if expanded, !store.diagnostics.history.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Recent reconciliations")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                        .textCase(.uppercase)

                    ForEach(store.diagnostics.history.prefix(10)) { entry in
                        VStack(alignment: .leading, spacing: 2) {
                            Text("\(DiagnosticsState.formatReconciliationStatus(entry.status)) · \(DiagnosticsState.formatRepeaterCount(entry.artifactCount))")
                                .font(.caption)
                            Text(entry.timestamp.formatted(date: .abbreviated, time: .standard))
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                        Divider()
                    }
                }
                .padding()
                .background(.background.secondary, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
        }
    }

    private var permissionLabel: String {
        switch store.diagnostics.notificationPermission {
        case .unknown: "unknown"
        case .granted: "granted"
        case .denied: "denied"
        case .unavailable: "unavailable"
        }
    }

    private var lastReconciledLabel: String {
        guard let date = store.diagnostics.lastReconciledAt else { return "never" }
        return date.formatted(date: .abbreviated, time: .standard)
    }

    private func diagnosticRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
            Spacer()
            Text(value)
                .font(.caption.weight(.medium))
        }
    }
}
