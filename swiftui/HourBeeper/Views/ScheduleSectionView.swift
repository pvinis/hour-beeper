import SwiftUI

struct ScheduleSectionView: View {
    @EnvironmentObject private var store: SettingsStore
    @State private var showCustom = false

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Schedule")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
                .textCase(.uppercase)

            VStack(spacing: 0) {
                ForEach(PresetScheduleId.allCases) { preset in
                    Button {
                        store.setSchedule(.preset(preset))
                        showCustom = false
                    } label: {
                        row(title: preset.label, selected: isSelected(preset))
                    }
                    .buttonStyle(.plain)

                    Divider()
                }

                Button {
                    showCustom = true
                    if case .custom = store.settings.schedule {
                        return
                    }
                    store.setSchedule(.custom([LocalTime(hour: 9, minute: 0)]))
                } label: {
                    row(title: "Custom hours", selected: showCustom && isCustom)
                }
                .buttonStyle(.plain)
            }
            .background(.background.secondary, in: RoundedRectangle(cornerRadius: 16, style: .continuous))

            if showCustom, case .custom(let times) = store.settings.schedule {
                CustomHoursPicker(times: times) { nextTimes in
                    store.setSchedule(.custom(nextTimes))
                }
            }
        }
        .onAppear {
            if case .custom = store.settings.schedule {
                showCustom = true
            }
        }
    }

    private var isCustom: Bool {
        if case .custom = store.settings.schedule { return true }
        return false
    }

    private func isSelected(_ preset: PresetScheduleId) -> Bool {
        guard case .preset(let current) = store.settings.schedule else { return false }
        return current == preset && !showCustom
    }

    private func row(title: String, selected: Bool) -> some View {
        HStack {
            Text(title)
                .foregroundStyle(.primary)
            Spacer()
            if selected {
                Image(systemName: "checkmark")
                    .foregroundStyle(.tint)
            }
        }
        .padding()
        .contentShape(Rectangle())
    }
}

private struct CustomHoursPicker: View {
    let times: [LocalTime]
    let setTimes: ([LocalTime]) -> Void

    private var selectedHours: Set<Int> {
        Set(times.map(\.hour))
    }

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 8), count: 4)

    var body: some View {
        LazyVGrid(columns: columns, spacing: 8) {
            ForEach(0..<24, id: \.self) { hour in
                Button {
                    toggle(hour)
                } label: {
                    Text(String(format: "%02d", hour))
                        .font(.subheadline.weight(.semibold))
                        .frame(maxWidth: .infinity, minHeight: 40)
                        .foregroundStyle(selectedHours.contains(hour) ? .white : .secondary)
                        .background(selectedHours.contains(hour) ? Color.accentColor : Color.secondary.opacity(0.14), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                }
                .buttonStyle(.plain)
            }
        }
        .padding()
        .background(.background.secondary, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private func toggle(_ hour: Int) {
        var next = selectedHours
        if next.contains(hour) {
            next.remove(hour)
        } else {
            next.insert(hour)
        }

        guard !next.isEmpty else { return }

        setTimes(next.sorted().map { LocalTime(hour: $0, minute: 0) })
    }
}
