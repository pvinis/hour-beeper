import AVFoundation
import Foundation

@MainActor
public final class SoundPreviewService: ObservableObject {
    private var player: AVAudioPlayer?

    public init() {}

    public func preview(_ sound: ChimeSound) {
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [.mixWithOthers])
            try AVAudioSession.sharedInstance().setActive(true)

            guard let url = Bundle.main.url(forResource: sound.notificationFilename.deletingPathExtension, withExtension: sound.notificationFilename.pathExtension) else {
                print("[SoundPreviewService] Missing sound resource: \(sound.notificationFilename)")
                return
            }

            player?.stop()
            let nextPlayer = try AVAudioPlayer(contentsOf: url)
            nextPlayer.currentTime = 0
            nextPlayer.prepareToPlay()
            nextPlayer.play()
            player = nextPlayer
        } catch {
            print("[SoundPreviewService] Failed to preview sound: \(error)")
        }
    }
}

private extension String {
    var pathExtension: String {
        (self as NSString).pathExtension
    }

    var deletingPathExtension: String {
        (self as NSString).deletingPathExtension
    }
}
