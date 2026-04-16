import ExpoModulesCore

#if canImport(AlarmKit)
import AlarmKit
import AppIntents
import SwiftUI
#endif

private let storedAlarmArtifactsKey = "HourBeeper.AlarmKit.StoredArtifacts"

struct AlarmKitArtifactRecord: Record, Codable {
  @Field var id: String = ""
  @Field var slotKey: String = ""
  @Field var hour: Int = 0
  @Field var minute: Int = 0
  @Field var weekdays: [Int] = []
  @Field var title: String = ""
  @Field var soundName: String = ""
}

public final class ExpoHourChimeAlarmKitModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoHourChimeAlarmKit")

    AsyncFunction("isAvailableAsync") { () -> Bool in
      #if canImport(AlarmKit)
      if #available(iOS 26.0, *) {
        return true
      }
      #endif
      return false
    }

    AsyncFunction("getAuthorizationStatusAsync") { () -> String in
      #if canImport(AlarmKit)
      if #available(iOS 26.0, *) {
        return authorizationStatusString(AlarmManager.shared.authorizationState)
      }
      #endif
      return "unavailable"
    }

    AsyncFunction("requestAuthorizationAsync") { () async -> String in
      #if canImport(AlarmKit)
      if #available(iOS 26.0, *) {
        do {
          let status = try await AlarmManager.shared.requestAuthorization()
          return authorizationStatusString(status)
        } catch {
          return "denied"
        }
      }
      #endif
      return "unavailable"
    }

    AsyncFunction("scheduleAlarmsAsync") { (artifacts: [AlarmKitArtifactRecord]) async throws -> [String] in
      #if canImport(AlarmKit)
      if #available(iOS 26.0, *) {
        var scheduledIds: [String] = []

        for artifact in artifacts {
          guard let uuid = UUID(uuidString: artifact.id) else {
            continue
          }

          let configuration = try buildConfiguration(for: artifact)
          try await AlarmManager.shared.schedule(id: uuid, configuration: configuration)
          scheduledIds.append(artifact.id)
        }

        try persistArtifacts(artifacts)
        return scheduledIds
      }
      #endif
      return []
    }

    AsyncFunction("cancelAllAsync") { () in
      #if canImport(AlarmKit)
      if #available(iOS 26.0, *) {
        let artifacts = loadArtifacts()

        for artifact in artifacts {
          guard let uuid = UUID(uuidString: artifact.id) else {
            continue
          }

          try? AlarmManager.shared.cancel(id: uuid)
        }
      }
      #endif

      clearArtifacts()
    }

    AsyncFunction("listScheduledAsync") { () -> [AlarmKitArtifactRecord] in
      return loadArtifacts()
    }
  }
}

private func persistArtifacts(_ artifacts: [AlarmKitArtifactRecord]) throws {
  let data = try JSONEncoder().encode(artifacts)
  UserDefaults.standard.set(data, forKey: storedAlarmArtifactsKey)
}

private func loadArtifacts() -> [AlarmKitArtifactRecord] {
  guard let data = UserDefaults.standard.data(forKey: storedAlarmArtifactsKey) else {
    return []
  }

  return (try? JSONDecoder().decode([AlarmKitArtifactRecord].self, from: data)) ?? []
}

private func clearArtifacts() {
  UserDefaults.standard.removeObject(forKey: storedAlarmArtifactsKey)
}

#if canImport(AlarmKit)
@available(iOS 26.0, *)
private struct HourChimeAlarmMetadata: AlarmMetadata {}

@available(iOS 26.0, *)
private struct HourChimeDismissIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Dismiss Alarm"
  static var openAppWhenRun: Bool = false

  init() {}

  func perform() async throws -> some IntentResult {
    .result()
  }
}

@available(iOS 26.0, *)
private func buildConfiguration(
  for artifact: AlarmKitArtifactRecord
) throws -> AlarmManager.AlarmConfiguration<HourChimeAlarmMetadata> {
  let stopButton = AlarmButton(
    text: LocalizedStringResource(stringLiteral: "Stop"),
    textColor: .white,
    systemImageName: "stop.circle"
  )

  let snoozeButton = AlarmButton(
    text: LocalizedStringResource(stringLiteral: "Snooze"),
    textColor: .white,
    systemImageName: "clock.badge.checkmark"
  )

  let alertPresentation = AlarmPresentation.Alert(
    title: LocalizedStringResource(stringLiteral: artifact.title),
    stopButton: stopButton,
    secondaryButton: snoozeButton,
    secondaryButtonBehavior: .countdown
  )

  let presentation = AlarmPresentation(alert: alertPresentation)
  let countdownDuration = Alarm.CountdownDuration(preAlert: nil, postAlert: TimeInterval(9 * 60))
  let attributes = AlarmAttributes<HourChimeAlarmMetadata>(
    presentation: presentation,
    metadata: HourChimeAlarmMetadata(),
    tintColor: .blue
  )

  let sound: AlertConfiguration.AlertSound = artifact.soundName.isEmpty ? .default : .named(artifact.soundName)
  let weekdays = artifact.weekdays.compactMap(localeWeekday)
  let time = Alarm.Schedule.Relative.Time(hour: artifact.hour, minute: artifact.minute)
  let recurrence = Alarm.Schedule.Relative.Recurrence.weekly(weekdays)
  let schedule = Alarm.Schedule.relative(Alarm.Schedule.Relative(time: time, repeats: recurrence))

  return AlarmManager.AlarmConfiguration<HourChimeAlarmMetadata>(
    countdownDuration: countdownDuration,
    schedule: schedule,
    attributes: attributes,
    stopIntent: HourChimeDismissIntent(),
    secondaryIntent: nil,
    sound: sound
  )
}

@available(iOS 26.0, *)
private func authorizationStatusString(_ status: AlarmManager.AuthorizationState) -> String {
  switch status {
  case .authorized:
    return "authorized"
  case .denied:
    return "denied"
  case .notDetermined:
    return "notDetermined"
  @unknown default:
    return "notDetermined"
  }
}

@available(iOS 26.0, *)
private func localeWeekday(from day: Int) -> Locale.Weekday? {
  switch day {
  case 1: return .sunday
  case 2: return .monday
  case 3: return .tuesday
  case 4: return .wednesday
  case 5: return .thursday
  case 6: return .friday
  case 7: return .saturday
  default: return nil
  }
}
#endif
