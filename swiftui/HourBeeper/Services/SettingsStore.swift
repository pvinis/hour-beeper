import Foundation

@MainActor
public final class SettingsStore: ObservableObject {
    @Published public private(set) var settings: ChimeSettings
    @Published public private(set) var diagnostics: DiagnosticsState
    @Published public private(set) var isReconciling = false

    private let userDefaults: UserDefaults
    private let reconciler: NotificationReconciler
    private let settingsKey = "hour-beeper.swiftui.chime-settings"
    private let diagnosticsKey = "hour-beeper.swiftui.diagnostics"
    private var reconciliationTask: Task<Void, Never>?
    private var reconciliationToken = UUID()

    public init(
        userDefaults: UserDefaults = .standard,
        reconciler: NotificationReconciler = NotificationReconciler(client: UserNotificationCenterClient())
    ) {
        self.userDefaults = userDefaults
        self.reconciler = reconciler
        self.settings = Self.load(ChimeSettings.self, key: settingsKey, from: userDefaults) ?? .default
        self.diagnostics = Self.load(DiagnosticsState.self, key: diagnosticsKey, from: userDefaults) ?? .default
    }

    public func setEnabled(_ enabled: Bool) {
        settings.enabled = enabled
        persistSettings()
        reconcile(requestPermissionsIfNeeded: enabled)
    }

    public func setSchedule(_ schedule: ChimeSchedule) {
        settings.schedule = schedule
        persistSettings()
        reconcile()
    }

    public func setSound(_ sound: ChimeSound) {
        settings.sound = sound
        persistSettings()
        reconcile()
    }

    public func requestPermission() {
        reconcile(requestPermissionsIfNeeded: true)
    }

    public func reconcile(requestPermissionsIfNeeded: Bool = false) {
        reconciliationTask?.cancel()

        let token = UUID()
        reconciliationToken = token
        let currentSettings = settings

        reconciliationTask = Task { [weak self] in
            guard let self else { return }
            self.isReconciling = true

            do {
                let result = try await reconciler.reconcile(settings: currentSettings, requestPermissionsIfNeeded: requestPermissionsIfNeeded)
                guard !Task.isCancelled, token == self.reconciliationToken else { return }

                self.diagnostics = self.diagnostics.recording(
                    status: result.status,
                    artifactCount: result.requestCount,
                    notificationPermission: result.permission
                )
                self.persistDiagnostics()
                self.isReconciling = false
            } catch is CancellationError {
                if token == self.reconciliationToken {
                    self.isReconciling = false
                }
            } catch {
                guard token == self.reconciliationToken else { return }
                self.diagnostics = self.diagnostics.recording(
                    status: "error",
                    artifactCount: nil,
                    error: error.localizedDescription
                )
                self.persistDiagnostics()
                self.isReconciling = false
            }
        }
    }

    private func persistSettings() {
        Self.save(settings, key: settingsKey, to: userDefaults)
    }

    private func persistDiagnostics() {
        Self.save(diagnostics, key: diagnosticsKey, to: userDefaults)
    }

    private static func load<T: Decodable>(_ type: T.Type, key: String, from userDefaults: UserDefaults) -> T? {
        guard let data = userDefaults.data(forKey: key) else { return nil }
        return try? JSONDecoder.hourBeeper.decode(T.self, from: data)
    }

    private static func save<T: Encodable>(_ value: T, key: String, to userDefaults: UserDefaults) {
        guard let data = try? JSONEncoder.hourBeeper.encode(value) else { return }
        userDefaults.set(data, forKey: key)
    }
}

extension JSONEncoder {
    static let hourBeeper: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }()
}

extension JSONDecoder {
    static let hourBeeper: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }()
}
