import XCTest
@testable import HourBeeper

final class DiagnosticsStateTests: XCTestCase {
    func testRecordsReconciliationStatusAndArtifactCount() {
        let now = Date(timeIntervalSince1970: 100)
        let diagnostics = DiagnosticsState.default.recording(status: "scheduled", artifactCount: 2, notificationPermission: .granted, now: now)

        XCTAssertEqual(diagnostics.notificationPermission, .granted)
        XCTAssertEqual(diagnostics.lastReconciledAt, now)
        XCTAssertEqual(diagnostics.lastScheduledArtifactCount, 2)
        XCTAssertNil(diagnostics.lastError)
        XCTAssertEqual(diagnostics.history, [DiagnosticsHistoryEntry(timestamp: now, status: "scheduled", artifactCount: 2)])
    }

    func testDiagnosticsHistoryIsCappedAt50Entries() {
        var diagnostics = DiagnosticsState.default

        for index in 0..<60 {
            diagnostics = diagnostics.recording(status: "scheduled", artifactCount: index, now: Date(timeIntervalSince1970: TimeInterval(index)))
        }

        XCTAssertEqual(diagnostics.history.count, 50)
        XCTAssertEqual(diagnostics.history.first?.artifactCount, 59)
        XCTAssertEqual(diagnostics.history.last?.artifactCount, 10)
    }

    func testFormattingHelpersMatchCurrentCopy() {
        XCTAssertEqual(DiagnosticsState.formatReconciliationStatus("migrated"), "migrated to repeaters")
        XCTAssertEqual(DiagnosticsState.formatRepeaterCount(nil), "—")
        XCTAssertEqual(DiagnosticsState.formatRepeaterCount(1), "1 repeater")
        XCTAssertEqual(DiagnosticsState.formatRepeaterCount(2), "2 repeaters")
    }
}
