import XCTest
@testable import HourBeeper

final class NotificationPlanBuilderTests: XCTestCase {
    func testBuildsOneRepeatingCalendarRequestForHourlyPreset() {
        let requests = NotificationPlanBuilder.buildRequests(settings: ChimeSettings(enabled: true, schedule: .preset(.hourly), sound: .low))

        XCTAssertEqual(requests, [NotificationRequestSpec(
            identifier: "hour-beeper.notification.calendar.minute-00",
            slotKey: "minute:00",
            body: "Chime for :00",
            trigger: .calendar(hour: nil, minute: 0, second: nil),
            sound: .low,
            soundFilename: "soft-beep.wav"
        )])
    }

    func testBuildsExactlyTwoRepeatingCalendarRequestsForEvery30Minutes() {
        let requests = pluck(NotificationPlanBuilder.buildRequests(settings: ChimeSettings(enabled: true, schedule: .preset(.every30Minutes), sound: .casio)))

        XCTAssertEqual(requests, [
            PluckedRequest(id: "hour-beeper.notification.calendar.minute-00", slotKey: "minute:00", trigger: .calendar(hour: nil, minute: 0, second: nil)),
            PluckedRequest(id: "hour-beeper.notification.calendar.minute-30", slotKey: "minute:30", trigger: .calendar(hour: nil, minute: 30, second: nil)),
        ])
    }

    func testBuildsStableLogicalSlotIdentifiersForCustomHours() {
        let requests = pluck(NotificationPlanBuilder.buildRequests(settings: ChimeSettings(enabled: true, schedule: ScheduleService.createCustomHoursSchedule([11, 16]), sound: .casio)))

        XCTAssertEqual(requests, [
            PluckedRequest(id: "hour-beeper.notification.calendar.11-00", slotKey: "11:00", trigger: .calendar(hour: 11, minute: 0, second: nil)),
            PluckedRequest(id: "hour-beeper.notification.calendar.16-00", slotKey: "16:00", trigger: .calendar(hour: 16, minute: 0, second: nil)),
        ])
    }

    func testBuildsCorrectSlotSetsForEvery2HoursAndEvery4Hours() {
        let everyTwoHours = NotificationPlanBuilder.buildRequests(settings: ChimeSettings(enabled: true, schedule: .preset(.every2Hours), sound: .casio))
        let everyFourHours = NotificationPlanBuilder.buildRequests(settings: ChimeSettings(enabled: true, schedule: .preset(.every4Hours), sound: .casio))

        XCTAssertEqual(everyTwoHours.map(\.slotKey), [
            "00:00", "02:00", "04:00", "06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00",
        ])
        XCTAssertEqual(everyFourHours.map(\.slotKey), ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"])
    }

    func testUsesSingleRepeatingIntervalRequestForEveryMinutePreset() {
        let requests = pluck(NotificationPlanBuilder.buildRequests(settings: ChimeSettings(enabled: true, schedule: .preset(.everyMinute), sound: .casio)))

        XCTAssertEqual(requests, [PluckedRequest(
            id: "hour-beeper.notification.timeInterval.interval-60s",
            slotKey: "interval:60s",
            trigger: .timeInterval(seconds: 60)
        )])
    }

    func testChangingSelectedSoundChangesPayloadWhileLeavingSlotIdentityStable() {
        let low = NotificationPlanBuilder.buildRequests(settings: ChimeSettings(enabled: true, schedule: ScheduleService.createCustomHoursSchedule([11, 16]), sound: .low))
        let mid = NotificationPlanBuilder.buildRequests(settings: ChimeSettings(enabled: true, schedule: ScheduleService.createCustomHoursSchedule([11, 16]), sound: .mid))

        XCTAssertEqual(low.map(\.identifier), mid.map(\.identifier))
        XCTAssertEqual(low.map(\.soundFilename), ["soft-beep.wav", "soft-beep.wav"])
        XCTAssertEqual(mid.map(\.soundFilename), ["digital-beep.wav", "digital-beep.wav"])
        XCTAssertNotEqual(low.map(\.fingerprint), mid.map(\.fingerprint))
    }

    func testRoundTripsRequestSpecThroughNativeNotificationRequestRecord() {
        let spec = NotificationPlanBuilder.buildRequests(settings: ChimeSettings(enabled: true, schedule: .preset(.hourly), sound: .casio))[0]
        let record = NotificationRecord(request: spec.makeNotificationRequest())

        XCTAssertEqual(record.fingerprint, spec.fingerprint)
        XCTAssertEqual(record.soundFilename, "casio-beep.wav")
        XCTAssertEqual(record.source, "hour-beeper")
    }

    func testReturnsNoRequestsWhenChimesAreDisabled() {
        XCTAssertEqual(NotificationPlanBuilder.buildRequests(settings: .default), [])
    }
}

private struct PluckedRequest: Equatable {
    var id: String
    var slotKey: String
    var trigger: NotificationTriggerSpec
}

private func pluck(_ specs: [NotificationRequestSpec]) -> [PluckedRequest] {
    specs.map { PluckedRequest(id: $0.identifier, slotKey: $0.slotKey, trigger: $0.trigger) }
}
