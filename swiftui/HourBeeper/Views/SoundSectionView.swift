import SwiftUI

struct SoundSectionView: View {
    @EnvironmentObject private var store: SettingsStore
    @EnvironmentObject private var preview: SoundPreviewService

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Sound")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
                .textCase(.uppercase)

            VStack(spacing: 0) {
                ForEach(Array(ChimeSound.allCases.enumerated()), id: \.element) { index, sound in
                    Button {
                        store.setSound(sound)
                        preview.preview(sound)
                    } label: {
                        HStack {
                            Text(sound.label)
                                .foregroundStyle(.primary)
                            Spacer()
                            if store.settings.sound == sound {
                                Image(systemName: "checkmark")
                                    .foregroundStyle(.tint)
                            }
                        }
                        .padding()
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityAddTraits(store.settings.sound == sound ? [.isSelected] : [])

                    if index < ChimeSound.allCases.count - 1 {
                        Divider()
                    }
                }
            }
            .background(.background.secondary, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
    }
}
