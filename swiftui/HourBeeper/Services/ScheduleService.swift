import Foundation

public enum ScheduleService {
    public static func createCustomHoursSchedule(_ hours: [Int]) -> ChimeSchedule {
        let times = LocalTime.normalize(hours.map { LocalTime(hour: $0, minute: 0) }.filter {
            (0...23).contains($0.hour)
        })

        if times.isEmpty {
            return ChimeSettings.default.schedule
        }

        return .custom(times)
    }

    public static func scheduleTimes(for schedule: ChimeSchedule) -> [LocalTime] {
        switch schedule {
        case .custom(let times):
            return LocalTime.normalize(times)
        case .preset(let preset):
            return presetTimes(for: preset)
        }
    }

    public static func materializeUpcomingOccurrences(
        schedule: ChimeSchedule,
        from: Date = Date(),
        count: Int = 24,
        calendar inputCalendar: Calendar = .current
    ) -> [MaterializedChimeOccurrence] {
        let count = max(1, count)
        let times = scheduleTimes(for: schedule)

        if times.isEmpty {
            return []
        }

        var calendar = inputCalendar
        let dayStart = calendar.startOfDay(for: from)
        let daySearchLimit = max(7, Int(ceil(Double(count) / Double(times.count))) + 2)
        var occurrences: [MaterializedChimeOccurrence] = []

        for dayOffset in 0..<daySearchLimit where occurrences.count < count {
            guard let currentDay = calendar.date(byAdding: .day, value: dayOffset, to: dayStart) else {
                continue
            }

            for localTime in times {
                guard let occursAt = buildLocalOccurrence(on: currentDay, localTime: localTime, calendar: calendar) else {
                    continue
                }

                guard occursAt > from else {
                    continue
                }

                occurrences.append(MaterializedChimeOccurrence(
                    id: isoString(occursAt),
                    occursAt: occursAt,
                    localTime: localTime
                ))

                if occurrences.count >= count {
                    break
                }
            }
        }

        return occurrences
    }

    private static func presetTimes(for preset: PresetScheduleId) -> [LocalTime] {
        switch preset {
        case .everyMinute:
            return LocalTime.normalize((0..<24).flatMap { hour in
                (0..<60).map { minute in LocalTime(hour: hour, minute: minute) }
            })
        case .every30Minutes:
            return LocalTime.normalize((0..<24).flatMap { hour in
                [LocalTime(hour: hour, minute: 0), LocalTime(hour: hour, minute: 30)]
            })
        case .hourly:
            return LocalTime.normalize((0..<24).map { LocalTime(hour: $0, minute: 0) })
        case .every2Hours:
            return LocalTime.normalize((0..<12).map { LocalTime(hour: $0 * 2, minute: 0) })
        case .every4Hours:
            return LocalTime.normalize((0..<6).map { LocalTime(hour: $0 * 4, minute: 0) })
        }
    }

    private static func buildLocalOccurrence(on day: Date, localTime: LocalTime, calendar: Calendar) -> Date? {
        var components = calendar.dateComponents([.year, .month, .day], from: day)
        components.calendar = calendar
        components.timeZone = calendar.timeZone
        components.hour = localTime.hour
        components.minute = localTime.minute
        components.second = 0
        components.nanosecond = 0

        guard let date = calendar.date(from: components) else {
            return nil
        }

        let realized = calendar.dateComponents([.hour, .minute], from: date)
        guard realized.hour == localTime.hour, realized.minute == localTime.minute else {
            return nil
        }

        return date
    }
}

private func isoString(_ date: Date) -> String {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter.string(from: date)
}
