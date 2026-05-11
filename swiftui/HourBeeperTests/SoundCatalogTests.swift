import XCTest
@testable import HourBeeper

final class SoundCatalogTests: XCTestCase {
    func testSoundCatalogOrderAndLabelsMatchCurrentApp() {
        XCTAssertEqual(ChimeSound.allCases, [.casio, .mid, .classic, .low])
        XCTAssertEqual(ChimeSound.allCases.map(\.label), ["Casio", "Mid", "Classic", "Low"])
    }

    func testNotificationFilenamesMatchBundledResourceNames() {
        XCTAssertEqual(ChimeSound.allCases.map(\.notificationFilename), [
            "casio-beep.wav",
            "digital-beep.wav",
            "classic-beep.wav",
            "soft-beep.wav",
        ])
    }

    func testNotificationSoundFilenamesResolveFromBundleRoot() {
        for sound in ChimeSound.allCases {
            XCTAssertNotNil(
                Bundle.main.url(
                    forResource: (sound.notificationFilename as NSString).deletingPathExtension,
                    withExtension: (sound.notificationFilename as NSString).pathExtension
                ),
                "Missing bundled sound resource: \(sound.notificationFilename)"
            )
        }
    }
}
