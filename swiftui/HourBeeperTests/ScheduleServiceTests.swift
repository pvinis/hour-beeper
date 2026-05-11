import XCTest
@testable import HourBeeper

final class ScheduleServiceTests: XCTestCase {
    func testMaterializesHourlyPresetWindowsAnchoredToLocalClock() throws {
        let occurrences = ScheduleService.materializeUpcomingOccurrences(
            schedule: ChimeSettings.default.schedule,
            from: try date("2026-04-16T10:15:00Z"),
            count: 4,
            calendar: utcCalendar
        )

        XCTAssertEqual(occurrences.map { iso($0.occursAt) }, [
            "2026-04-16T11:00:00.000Z",
            "2026-04-16T12:00:00.000Z",
            "2026-04-16T13:00:00.000Z",
            "2026-04-16T14:00:00.000Z",
        ])
    }

    func testMaterializesEveryMinuteFromNextMinuteBoundary() throws {
        let occurrences = ScheduleService.materializeUpcomingOccurrences(
            schedule: .preset(.everyMinute),
            from: try date("2026-04-16T10:17:00Z"),
            count: 4,
            calendar: utcCalendar
        )

        XCTAssertEqual(occurrences.map { iso($0.occursAt) }, [
            "2026-04-16T10:18:00.000Z",
            "2026-04-16T10:19:00.000Z",
            "2026-04-16T10:20:00.000Z",
            "2026-04-16T10:21:00.000Z",
        ])
    }

    func testMaterializesOnlySelectedCustomHours() throws {
        let occurrences = ScheduleService.materializeUpcomingOccurrences(
            schedule: ScheduleService.createCustomHoursSchedule([11, 16]),
            from: try date("2026-04-16T10:15:00Z"),
            count: 4,
            calendar: utcCalendar
        )

        XCTAssertEqual(occurrences.map { iso($0.occursAt) }, [
            "2026-04-16T11:00:00.000Z",
            "2026-04-16T16:00:00.000Z",
            "2026-04-17T11:00:00.000Z",
            "2026-04-17T16:00:00.000Z",
        ])
    }

    func testDeduplicatesDuplicateSelectedHours() {
        XCTAssertEqual(
            ScheduleService.createCustomHoursSchedule([16, 11, 16, 11]),
            .custom([LocalTime(hour: 11, minute: 0), LocalTime(hour: 16, minute: 0)])
        )
    }

    func testRecalculatesSchedulesCorrectlyAfterMidnight() throws {
        let schedule = ScheduleService.createCustomHoursSchedule([0, 23])

        XCTAssertEqual(
            ScheduleService.materializeUpcomingOccurrences(
                schedule: schedule,
                from: try date("2026-04-16T23:30:00Z"),
                count: 2,
                calendar: utcCalendar
            ).map { iso($0.occursAt) },
            ["2026-04-17T00:00:00.000Z", "2026-04-17T23:00:00.000Z"]
        )

        XCTAssertEqual(
            ScheduleService.materializeUpcomingOccurrences(
                schedule: schedule,
                from: try date("2026-04-17T00:30:00Z"),
                count: 2,
                calendar: utcCalendar
            ).map { iso($0.occursAt) },
            ["2026-04-17T23:00:00.000Z", "2026-04-18T00:00:00.000Z"]
        )
    }

    func testRecalculatesFutureFiringsAgainstCurrentLocalClockAfterTimezoneShifts() throws {
        let schedule = ScheduleService.createCustomHoursSchedule([9])
        let newYorkNow = try zonedDate("2026-07-01T08:30:00", timeZone: "America/New_York")
        let sameInstantInLosAngeles = newYorkNow

        XCTAssertEqual(
            localISO(ScheduleService.materializeUpcomingOccurrences(
                schedule: schedule,
                from: newYorkNow,
                count: 1,
                calendar: calendar(timeZone: "America/New_York")
            )[0].occursAt, timeZone: "America/New_York"),
            "2026-07-01T09:00:00.000-04:00"
        )

        XCTAssertEqual(
            localISO(ScheduleService.materializeUpcomingOccurrences(
                schedule: schedule,
                from: sameInstantInLosAngeles,
                count: 1,
                calendar: calendar(timeZone: "America/Los_Angeles")
            )[0].occursAt, timeZone: "America/Los_Angeles"),
            "2026-07-01T09:00:00.000-07:00"
        )
    }

    func testSanitizesCorruptedSettingsToDefaults() {
        let sanitized = ChimeSettings.sanitized([
            "enabled": "definitely",
            "schedule": ["kind": "custom", "times": [["hour": 99, "minute": -5]]],
            "sound": "airhorn",
            "deliveryMode": "pigeon",
        ])

        XCTAssertEqual(sanitized, .default)
    }

    func testMigratesLegacyPresetAndSoundIds() {
        let sanitized = ChimeSettings.sanitized([
            "enabled": true,
            "schedule": ["kind": "preset", "preset": "every-5-minutes"],
            "sound": "digital",
        ])

        XCTAssertEqual(sanitized.enabled, true)
        XCTAssertEqual(sanitized.schedule, .preset(.everyMinute))
        XCTAssertEqual(sanitized.sound, .mid)
        XCTAssertEqual(ChimeSettings.sanitized(["sound": "soft"]).sound, .low)
    }
}

private var utcCalendar: Calendar { calendar(timeZone: "UTC") }

private func calendar(timeZone: String) -> Calendar {
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = TimeZone(identifier: timeZone)!
    return calendar
}

private func date(_ string: String) throws -> Date {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime]
    return try XCTUnwrap(formatter.date(from: string))
}

private func zonedDate(_ string: String, timeZone: String) throws -> Date {
    let formatter = DateFormatter()
    formatter.calendar = Calendar(identifier: .gregorian)
    formatter.timeZone = TimeZone(identifier: timeZone)!
    formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
    return try XCTUnwrap(formatter.date(from: string))
}

private func iso(_ date: Date) -> String {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    formatter.timeZone = TimeZone(secondsFromGMT: 0)
    return formatter.string(from: date)
}

private func localISO(_ date: Date, timeZone: String) -> String {
    let formatter = DateFormatter()
    formatter.calendar = Calendar(identifier: .gregorian)
    formatter.timeZone = TimeZone(identifier: timeZone)!
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSXXXXX"
    return formatter.string(from: date)
}
