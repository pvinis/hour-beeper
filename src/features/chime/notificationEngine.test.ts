import { DateTime } from "luxon"
import { describe, expect, it, vi } from "vitest"

import {
	DEFAULT_CHIME_SETTINGS,
	createCustomHoursSchedule,
	materializeUpcomingOccurrences,
} from "./schedule"
import {
	buildNotificationRequests,
	configureNotificationRuntime,
	getAndroidNotificationChannelDefinitions,
	dismissPreviousPresentedHourBeeperNotification,
	dismissPresentedHourBeeperNotifications,
	dismissPresentedNotificationIfOwned,
	reconcileNotificationSchedule,
	toExpoTriggerInput,
	type HourBeeperNotificationRequest,
	type NotificationClient,
	type PresentedNotificationRecord,
	type ScheduledNotificationRecord,
} from "./notificationEngine"

const from = DateTime.fromISO("2026-04-16T10:15:00", { zone: "UTC" })
const grantedPermissions = { granted: true, status: "granted" as const, canAskAgain: true }

describe("buildNotificationRequests", () => {
	it("builds one repeating calendar request for the hourly preset", () => {
		const settings = {
			...DEFAULT_CHIME_SETTINGS,
			enabled: true,
			sound: "low" as const,
		}

		const requests = buildNotificationRequests(settings)

		expect(requests).toEqual([
			{
				identifier: "hour-beeper.notification.calendar.minute-00",
				trigger: {
					type: "calendar",
					repeats: true,
					minute: 0,
				},
				content: expect.objectContaining({
					sound: "soft_beep.wav",
					threadIdentifier: "hour-beeper.chimes",
					data: expect.objectContaining({
						source: "hour-beeper",
						slotKey: "minute:00",
						triggerType: "calendar",
						sound: "low",
					}),
				}),
			},
		])
		expect(requests[0]?.trigger).not.toHaveProperty("timezone")
	})

	it("builds exactly two repeating calendar requests for the every-30-minutes preset", () => {
		const settings = {
			...DEFAULT_CHIME_SETTINGS,
			enabled: true,
			schedule: { kind: "preset" as const, preset: "every-30-minutes" as const },
		}

		const requests = buildNotificationRequests(settings)

		expect(pluckRequests(requests)).toEqual([
			{
				id: "hour-beeper.notification.calendar.minute-00",
				slotKey: "minute:00",
				triggerType: "calendar",
				trigger: { type: "calendar", repeats: true, minute: 0 },
			},
			{
				id: "hour-beeper.notification.calendar.minute-30",
				slotKey: "minute:30",
				triggerType: "calendar",
				trigger: { type: "calendar", repeats: true, minute: 30 },
			},
		])
	})

	it("builds stable logical-slot identifiers for custom hours", () => {
		const settings = {
			...DEFAULT_CHIME_SETTINGS,
			enabled: true,
			schedule: createCustomHoursSchedule([11, 16]),
		}

		const requests = buildNotificationRequests(settings)

		expect(pluckRequests(requests)).toEqual([
			{
				id: "hour-beeper.notification.calendar.11-00",
				slotKey: "11:00",
				triggerType: "calendar",
				trigger: { type: "calendar", repeats: true, hour: 11, minute: 0 },
			},
			{
				id: "hour-beeper.notification.calendar.16-00",
				slotKey: "16:00",
				triggerType: "calendar",
				trigger: { type: "calendar", repeats: true, hour: 16, minute: 0 },
			},
		])
	})

	it("builds the correct slot sets for every-2-hours and every-4-hours", () => {
		const everyTwoHours = buildNotificationRequests({
			...DEFAULT_CHIME_SETTINGS,
			enabled: true,
			schedule: { kind: "preset", preset: "every-2-hours" },
		})
		const everyFourHours = buildNotificationRequests({
			...DEFAULT_CHIME_SETTINGS,
			enabled: true,
			schedule: { kind: "preset", preset: "every-4-hours" },
		})

		expect(everyTwoHours.map((request) => request.content.data.slotKey)).toEqual([
			"00:00",
			"02:00",
			"04:00",
			"06:00",
			"08:00",
			"10:00",
			"12:00",
			"14:00",
			"16:00",
			"18:00",
			"20:00",
			"22:00",
		])
		expect(everyFourHours.map((request) => request.content.data.slotKey)).toEqual([
			"00:00",
			"04:00",
			"08:00",
			"12:00",
			"16:00",
			"20:00",
		])
	})

	it("uses a single repeating 60-second interval request for the every-minute preset", () => {
		const settings = {
			...DEFAULT_CHIME_SETTINGS,
			enabled: true,
			schedule: { kind: "preset" as const, preset: "every-minute" as const },
		}

		const requests = buildNotificationRequests(settings)

		expect(pluckRequests(requests)).toEqual([
			{
				id: "hour-beeper.notification.timeInterval.interval-60s",
				slotKey: "interval:60s",
				triggerType: "timeInterval",
				trigger: { type: "timeInterval", repeats: true, seconds: 60 },
			},
		])
	})

	it("builds Android daily requests with channel-bound sound metadata", () => {
		const settings = {
			...DEFAULT_CHIME_SETTINGS,
			enabled: true,
			sound: "low" as const,
		}

		const requests = buildNotificationRequests(settings, { platform: "android" })

		expect(requests).toHaveLength(24)
		expect(requests.map((request) => request.trigger.type)).not.toContain("calendar")
		expect(requests[0]).toEqual(
			expect.objectContaining({
				identifier: "hour-beeper.notification.daily.00-00",
				trigger: {
					type: "daily",
					hour: 0,
					minute: 0,
					channelId: "hour_beeper_chime_low_v2",
				},
				content: expect.objectContaining({
					sound: "soft_beep.wav",
					data: expect.objectContaining({
						androidChannelId: "hour_beeper_chime_low_v2",
						triggerType: "daily",
						sound: "low",
					}),
				}),
			}),
		)
	})

	it("expands Android every-30-minutes into supported daily requests", () => {
		const requests = buildNotificationRequests(
			{
				...DEFAULT_CHIME_SETTINGS,
				enabled: true,
				schedule: { kind: "preset", preset: "every-30-minutes" },
			},
			{ platform: "android" },
		)

		expect(requests).toHaveLength(48)
		expect(requests.map((request) => request.trigger.type)).not.toContain("calendar")
		expect(requests.slice(0, 4).map((request) => request.trigger)).toEqual([
			{ type: "daily", hour: 0, minute: 0, channelId: "hour_beeper_chime_bellio_v2" },
			{ type: "daily", hour: 0, minute: 30, channelId: "hour_beeper_chime_bellio_v2" },
			{ type: "daily", hour: 1, minute: 0, channelId: "hour_beeper_chime_bellio_v2" },
			{ type: "daily", hour: 1, minute: 30, channelId: "hour_beeper_chime_bellio_v2" },
		])
	})

	it("changing the selected sound changes the payload while leaving slot identity stable", () => {
		const lowRequests = buildNotificationRequests({
			...DEFAULT_CHIME_SETTINGS,
			enabled: true,
			schedule: createCustomHoursSchedule([11, 16]),
			sound: "low",
		})
		const midRequests = buildNotificationRequests({
			...DEFAULT_CHIME_SETTINGS,
			enabled: true,
			schedule: createCustomHoursSchedule([11, 16]),
			sound: "mid",
		})

		expect(lowRequests.map((request) => request.identifier)).toEqual(
			midRequests.map((request) => request.identifier),
		)
		expect(lowRequests.map((request) => request.content.sound)).toEqual([
			"soft_beep.wav",
			"soft_beep.wav",
		])
		expect(midRequests.map((request) => request.content.sound)).toEqual([
			"digital_beep.wav",
			"digital_beep.wav",
		])
	})

	it("returns no requests when chimes are disabled", () => {
		expect(buildNotificationRequests(DEFAULT_CHIME_SETTINGS)).toEqual([])
	})
})

describe("Android notification channels", () => {
	it("defines one channel for each bundled sound", () => {
		expect(getAndroidNotificationChannelDefinitions()).toEqual([
			{
				id: "hour_beeper_chime_bellio_v2",
				name: "Hour Bell — Bellio",
				sound: "bellio_beep.wav",
				audioAttributes: { usage: 5, contentType: 4 },
			},
			{
				id: "hour_beeper_chime_mid_v2",
				name: "Hour Bell — Mid",
				sound: "digital_beep.wav",
				audioAttributes: { usage: 5, contentType: 4 },
			},
			{
				id: "hour_beeper_chime_classic_v2",
				name: "Hour Bell — Classic",
				sound: "classic_beep.wav",
				audioAttributes: { usage: 5, contentType: 4 },
			},
			{
				id: "hour_beeper_chime_low_v2",
				name: "Hour Bell — Low",
				sound: "soft_beep.wav",
				audioAttributes: { usage: 5, contentType: 4 },
			},
		])
	})
})

describe("toExpoTriggerInput", () => {
	it("omits undefined optional calendar fields when adapting minute-only repeaters", () => {
		const Notifications = createFakeNotificationsModule()
		const request = buildNotificationRequests({
			...DEFAULT_CHIME_SETTINGS,
			enabled: true,
		})[0]!

		const trigger = toExpoTriggerInput(Notifications, request.trigger)

		expect(trigger).toEqual({
			type: "calendar",
			repeats: true,
			minute: 0,
		})
		expect(trigger).not.toHaveProperty("hour")
		expect(trigger).not.toHaveProperty("second")
	})

	it("includes Android channel ids when adapting Android repeaters", () => {
		const Notifications = createFakeNotificationsModule()
		const request = buildNotificationRequests(
			{
				...DEFAULT_CHIME_SETTINGS,
				enabled: true,
				sound: "mid",
			},
			{ platform: "android" },
		)[0]!

		const trigger = toExpoTriggerInput(Notifications, request.trigger)

		expect(trigger).toEqual({
			type: "daily",
			hour: 0,
			minute: 0,
			channelId: "hour_beeper_chime_mid_v2",
		})
	})
})

describe("dismissPresentedNotificationIfOwned", () => {
	it("dismisses a delivered Hour Beeper notification by exact identifier", async () => {
		const presented = toPresentedRecords(
			buildNotificationRequests({
				...DEFAULT_CHIME_SETTINGS,
				enabled: true,
				schedule: createCustomHoursSchedule([11]),
			}),
			[100],
		)
		const fakeClient = createFakeClient({
			permissions: grantedPermissions,
			presented,
		})

		const didDismiss = await dismissPresentedNotificationIfOwned(fakeClient, presented[0]!)

		expect(didDismiss).toBe(true)
		expect(fakeClient.dismissedIds).toEqual([presented[0]!.identifier])
	})

	it("ignores delivered notifications that do not belong to Hour Beeper", async () => {
		const foreignNotification = {
			identifier: "other-app.notification.2026-04-16T11:00:00.000Z",
			content: {
				sound: "soft_beep.wav",
				data: { source: "other-app", sound: "low" },
			},
			date: 100,
		}
		const fakeClient = createFakeClient({
			permissions: grantedPermissions,
			presented: [foreignNotification],
		})

		const didDismiss = await dismissPresentedNotificationIfOwned(fakeClient, foreignNotification)

		expect(didDismiss).toBe(false)
		expect(fakeClient.dismissedIds).toEqual([])
	})
})

describe("dismissPreviousPresentedHourBeeperNotification", () => {
	it("dismisses the previous presented Hour Beeper notification while keeping the current one", async () => {
		const requests = buildNotificationRequests({
			...DEFAULT_CHIME_SETTINGS,
			enabled: true,
			schedule: createCustomHoursSchedule([11, 16, 18]),
		})
		const presented = toPresentedRecords(requests.slice(0, 2), [100, 200])
		const fakeClient = createFakeClient({
			permissions: grantedPermissions,
			presented,
		})

		const dismissedId = await dismissPreviousPresentedHourBeeperNotification(fakeClient, {
			identifier: requests[2]!.identifier,
			content: requests[2]!.content,
			trigger: requests[2]!.trigger,
			date: 300,
		})

		expect(dismissedId).toBe(presented[1]!.identifier)
		expect(fakeClient.dismissedIds).toEqual([presented[1]!.identifier])
	})
})

describe("dismissPresentedHourBeeperNotifications", () => {
	it("keeps only the newest presented Hour Beeper notification and leaves unrelated ones untouched", async () => {
		const requests = buildNotificationRequests({
			...DEFAULT_CHIME_SETTINGS,
			enabled: true,
			schedule: createCustomHoursSchedule([11, 16]),
		})
		const presented = toPresentedRecords(requests, [100, 200])
		const foreignNotification = {
			identifier: "other-app.notification.2026-04-16T13:00:00.000Z",
			content: {
				sound: "digital_beep.wav",
				data: { source: "other-app", sound: "mid" },
			},
			date: 150,
		}
		const fakeClient = createFakeClient({
			permissions: grantedPermissions,
			presented: [...presented, foreignNotification],
		})

		const dismissedIds = await dismissPresentedHourBeeperNotifications(fakeClient)

		expect(dismissedIds).toEqual([presented[0]!.identifier])
		expect(fakeClient.dismissedIds).toEqual([presented[0]!.identifier])
	})

	it("orders multiple deliveries from the same logical slot by delivery time", async () => {
		const [request] = buildNotificationRequests({
			...DEFAULT_CHIME_SETTINGS,
			enabled: true,
			schedule: { kind: "preset", preset: "hourly" },
		})
		const olderDelivery: PresentedNotificationRecord = {
			identifier: request!.identifier,
			content: request!.content,
			trigger: request!.trigger,
			date: 100,
		}
		const newerDelivery: PresentedNotificationRecord = {
			identifier: request!.identifier,
			content: request!.content,
			trigger: request!.trigger,
			date: 200,
		}
		const fakeClient = createFakeClient({
			permissions: grantedPermissions,
			presented: [olderDelivery, newerDelivery],
		})

		const dismissedIds = await dismissPresentedHourBeeperNotifications(fakeClient)

		expect(dismissedIds).toEqual([request!.identifier])
		expect(fakeClient.dismissedIds).toEqual([request!.identifier])
	})
})

describe("configureNotificationRuntime", () => {
	it("registers one receive listener, keeps the current notification, and collapses older ones", async () => {
		const requests = buildNotificationRequests({
			...DEFAULT_CHIME_SETTINGS,
			enabled: true,
			schedule: createCustomHoursSchedule([11, 16, 18]),
		})
		const presented = toPresentedRecords(requests.slice(0, 2), [100, 200])
		const fakeClient = createFakeClient({
			permissions: grantedPermissions,
			presented,
		})

		const receiveListeners: Array<
			(notification: {
				date: number
				request: {
					identifier: string
					content: { sound?: string | boolean | null; data?: Record<string, unknown>; threadIdentifier?: string | null }
					trigger?: unknown
				}
			}) => void
		> = []
		const activeListeners: Array<(state: string) => void> = []
		const notifications = {
			setNotificationHandler: vi.fn(),
			addNotificationReceivedListener: vi.fn((listener) => {
				receiveListeners.push(listener)
				return { remove: vi.fn() }
			}),
		}
		const appState = {
			addEventListener: vi.fn((event: string, listener: (state: string) => void) => {
				if (event === "change") {
					activeListeners.push(listener)
				}
				return { remove: vi.fn() }
			}),
		}

		const cleanup = await configureNotificationRuntime(fakeClient, {
			notifications,
			appState,
		})
		await Promise.resolve()

		expect(notifications.setNotificationHandler).toHaveBeenCalledTimes(1)
		expect(notifications.addNotificationReceivedListener).toHaveBeenCalledTimes(1)
		expect(appState.addEventListener).toHaveBeenCalledTimes(1)
		expect(fakeClient.dismissedIds).toEqual([presented[0]!.identifier])

		receiveListeners[0]!({
			date: 300,
			request: {
				identifier: requests[2]!.identifier,
				content: requests[2]!.content,
				trigger: requests[2]!.trigger,
			},
		})
		await Promise.resolve()

		expect(fakeClient.dismissedIds).toEqual([
			presented[0]!.identifier,
			presented[1]!.identifier,
		])

		activeListeners[0]!("active")
		await Promise.resolve()

		expect(fakeClient.dismissedIds).toEqual([
			presented[0]!.identifier,
			presented[1]!.identifier,
		])

		await configureNotificationRuntime(fakeClient, {
			notifications,
			appState,
		})
		await Promise.resolve()

		expect(notifications.addNotificationReceivedListener).toHaveBeenCalledTimes(1)
		expect(appState.addEventListener).toHaveBeenCalledTimes(1)

		cleanup()
	})

	it("suppresses OS sound and plays owned foreground chimes through app-owned playback", async () => {
		const [request] = buildNotificationRequests({
			...DEFAULT_CHIME_SETTINGS,
			enabled: true,
			sound: "bellio",
		})
		const fakeClient = createFakeClient({
			permissions: grantedPermissions,
		})
		const playChime = vi.fn().mockResolvedValue(undefined)
		const receiveListeners: Array<(notification: {
			date: number
			request: {
				identifier: string
				content: { sound?: string | boolean | null; data?: Record<string, unknown>; threadIdentifier?: string | null }
				trigger?: unknown
			}
		}) => void> = []
		let handler: null | {
			handleNotification: (notification: {
				date: number
				request: {
					identifier: string
					content: { sound?: string | boolean | null; data?: Record<string, unknown>; threadIdentifier?: string | null }
					trigger?: unknown
				}
			}) => Promise<{ shouldPlaySound: boolean }>
		} = null
		const notifications = {
			setNotificationHandler: vi.fn((nextHandler) => {
				handler = nextHandler
			}),
			addNotificationReceivedListener: vi.fn((listener) => {
				receiveListeners.push(listener)
				return { remove: vi.fn() }
			}),
		}
		const appState = {
			addEventListener: vi.fn(() => ({ remove: vi.fn() })),
		}

		const cleanup = await configureNotificationRuntime(fakeClient, {
			notifications,
			appState,
			chimePlayback: { playChime },
		})

		await expect(handler!.handleNotification({
			date: 100,
			request: {
				identifier: request!.identifier,
				content: request!.content,
				trigger: request!.trigger,
			},
		})).resolves.toMatchObject({ shouldPlaySound: false })

		receiveListeners[0]!({
			date: 100,
			request: {
				identifier: request!.identifier,
				content: request!.content,
				trigger: request!.trigger,
			},
		})
		await Promise.resolve()

		expect(playChime).toHaveBeenCalledWith("bellio")

		cleanup()
	})

	it("contains playback adapter rejections and still cleans up older notifications", async () => {
		const requests = buildNotificationRequests({
			...DEFAULT_CHIME_SETTINGS,
			enabled: true,
			schedule: createCustomHoursSchedule([11, 16]),
		})
		const presented = toPresentedRecords(requests.slice(0, 1), [100])
		const fakeClient = createFakeClient({
			permissions: grantedPermissions,
			presented,
		})
		const playChime = vi.fn().mockRejectedValue(new Error("play failed"))
		const receiveListeners: Array<(notification: {
			date: number
			request: {
				identifier: string
				content: { sound?: string | boolean | null; data?: Record<string, unknown>; threadIdentifier?: string | null }
				trigger?: unknown
			}
		}) => void> = []
		const notifications = {
			setNotificationHandler: vi.fn(),
			addNotificationReceivedListener: vi.fn((listener) => {
				receiveListeners.push(listener)
				return { remove: vi.fn() }
			}),
		}
		const appState = {
			addEventListener: vi.fn(() => ({ remove: vi.fn() })),
		}
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {})

		const cleanup = await configureNotificationRuntime(fakeClient, {
			notifications,
			appState,
			chimePlayback: { playChime },
		})
		await Promise.resolve()

		receiveListeners[0]!({
			date: 200,
			request: {
				identifier: requests[1]!.identifier,
				content: requests[1]!.content,
				trigger: requests[1]!.trigger,
			},
		})
		await Promise.resolve()
		await Promise.resolve()

		expect(playChime).toHaveBeenCalledWith("bellio")
		expect(fakeClient.dismissedIds).toEqual([presented[0]!.identifier])
		expect(warn).toHaveBeenCalledWith(
			"[notificationEngine] Failed to play foreground chime:",
			expect.any(Error),
		)

		warn.mockRestore()
		cleanup()
	})

	it("keeps OS sound for unknown notifications and owned chimes without playback readiness", async () => {
		const [request] = buildNotificationRequests({
			...DEFAULT_CHIME_SETTINGS,
			enabled: true,
		})
		const fakeClient = createFakeClient({
			permissions: grantedPermissions,
		})
		let handler: null | {
			handleNotification: (notification: {
				date: number
				request: {
					identifier: string
					content: { sound?: string | boolean | null; data?: Record<string, unknown>; threadIdentifier?: string | null }
					trigger?: unknown
				}
			}) => Promise<{ shouldPlaySound: boolean }>
		} = null
		const notifications = {
			setNotificationHandler: vi.fn((nextHandler) => {
				handler = nextHandler
			}),
			addNotificationReceivedListener: vi.fn(() => ({ remove: vi.fn() })),
		}
		const appState = {
			addEventListener: vi.fn(() => ({ remove: vi.fn() })),
		}

		const cleanup = await configureNotificationRuntime(fakeClient, { notifications, appState })

		await expect(handler!.handleNotification({
			date: 100,
			request: {
				identifier: request!.identifier,
				content: request!.content,
				trigger: request!.trigger,
			},
		})).resolves.toMatchObject({ shouldPlaySound: true })
		await expect(handler!.handleNotification({
			date: 100,
			request: {
				identifier: "foreign",
				content: { data: { source: "other-app" }, sound: "default" },
			},
		})).resolves.toMatchObject({ shouldPlaySound: true })

		cleanup()
	})

	it("keeps OS sound for owned chimes with invalid sound metadata", async () => {
		const [request] = buildNotificationRequests({
			...DEFAULT_CHIME_SETTINGS,
			enabled: true,
		})
		const fakeClient = createFakeClient({
			permissions: grantedPermissions,
		})
		const playChime = vi.fn().mockResolvedValue(undefined)
		let handler: null | {
			handleNotification: (notification: {
				date: number
				request: {
					identifier: string
					content: { sound?: string | boolean | null; data?: Record<string, unknown>; threadIdentifier?: string | null }
					trigger?: unknown
				}
			}) => Promise<{ shouldPlaySound: boolean }>
		} = null
		const notifications = {
			setNotificationHandler: vi.fn((nextHandler) => {
				handler = nextHandler
			}),
			addNotificationReceivedListener: vi.fn(() => ({ remove: vi.fn() })),
		}
		const appState = {
			addEventListener: vi.fn(() => ({ remove: vi.fn() })),
		}

		const cleanup = await configureNotificationRuntime(fakeClient, {
			notifications,
			appState,
			chimePlayback: { playChime },
		})

		await expect(handler!.handleNotification({
			date: 100,
			request: {
				identifier: request!.identifier,
				content: { ...request!.content, data: { ...request!.content.data, sound: "missing" } },
				trigger: request!.trigger,
			},
		})).resolves.toMatchObject({ shouldPlaySound: true })

		expect(playChime).not.toHaveBeenCalled()

		cleanup()
	})
})

describe("reconcileNotificationSchedule", () => {
	it("ensures Android channels before scheduling Android requests", async () => {
		const settings = {
			...DEFAULT_CHIME_SETTINGS,
			enabled: true,
			sound: "classic" as const,
		}
		const fakeClient = createFakeClient({
			permissions: grantedPermissions,
			platform: "android",
		})

		const result = await reconcileNotificationSchedule(fakeClient, settings)

		expect(result.status).toBe("scheduled")
		expect(fakeClient.ensuredAndroidChannels).toEqual(getAndroidNotificationChannelDefinitions())
		expect(fakeClient.scheduled).toHaveLength(24)
		expect(fakeClient.scheduled.map((request) => request.trigger).slice(0, 3)).toEqual([
			{ type: "daily", hour: 0, minute: 0, channelId: "hour_beeper_chime_classic_v2" },
			{ type: "daily", hour: 1, minute: 0, channelId: "hour_beeper_chime_classic_v2" },
			{ type: "daily", hour: 2, minute: 0, channelId: "hour_beeper_chime_classic_v2" },
		])
	})

	it("replaces stale requests when the schedule or sound changes", async () => {
		const existingSettings = {
			...DEFAULT_CHIME_SETTINGS,
			enabled: true,
			sound: "classic" as const,
		}
		const nextSettings = {
			...DEFAULT_CHIME_SETTINGS,
			enabled: true,
			schedule: createCustomHoursSchedule([11, 16]),
			sound: "mid" as const,
		}
		const existing = toScheduledRecords(buildNotificationRequests(existingSettings))
		const fakeClient = createFakeClient({
			permissions: grantedPermissions,
			existing,
		})

		const result = await reconcileNotificationSchedule(fakeClient, nextSettings)

		expect(result.status).toBe("scheduled")
		expect(result.canceledIds).toEqual(existing.map((request) => request.identifier))
		expect(fakeClient.scheduled.map((request) => request.content.sound)).toEqual([
			"digital_beep.wav",
			"digital_beep.wav",
		])
		expect(fakeClient.scheduled.map((request) => request.identifier)).toEqual([
			"hour-beeper.notification.calendar.11-00",
			"hour-beeper.notification.calendar.16-00",
		])
		expect(fakeClient.scheduled.map((request) => request.trigger)).toEqual([
			{ type: "calendar", repeats: true, hour: 11, minute: 0 },
			{ type: "calendar", repeats: true, hour: 16, minute: 0 },
		])
	})

	it("does not duplicate existing requests on rehydrate when the repeater plan already matches", async () => {
		const settings = {
			...DEFAULT_CHIME_SETTINGS,
			enabled: true,
		}
		const existing = toScheduledRecords(buildNotificationRequests(settings))
		const fakeClient = createFakeClient({
			permissions: grantedPermissions,
			existing,
		})

		const result = await reconcileNotificationSchedule(fakeClient, settings)

		expect(result.status).toBe("unchanged")
		expect(result.canceledIds).toEqual([])
		expect(fakeClient.scheduled).toEqual([])
	})

	it("migrates old DATE-trigger batches to repeaters in one reconciliation pass", async () => {
		const settings = {
			...DEFAULT_CHIME_SETTINGS,
			enabled: true,
		}
		const existing = toLegacyDateScheduledRecords(settings, { from, count: 3 })
		const fakeClient = createFakeClient({
			permissions: grantedPermissions,
			existing,
		})

		const result = await reconcileNotificationSchedule(fakeClient, settings)

		expect(result.status).toBe("migrated")
		expect(result.canceledIds).toEqual(existing.map((record) => record.identifier))
		expect(fakeClient.scheduled.map((request) => request.identifier)).toEqual([
			"hour-beeper.notification.calendar.minute-00",
		])
		await expect(fakeClient.getAllScheduledNotificationsAsync()).resolves.toEqual([
			expect.objectContaining({
				identifier: "hour-beeper.notification.calendar.minute-00",
				trigger: { type: "calendar", repeats: true, minute: 0 },
			}),
		])
	})

	it("clears only Hour Beeper requests from a mixed pending set during migration", async () => {
		const settings = {
			...DEFAULT_CHIME_SETTINGS,
			enabled: true,
		}
		const existing = toLegacyDateScheduledRecords(settings, { from, count: 2 })
		const foreignNotification: ScheduledNotificationRecord = {
			identifier: "other-app.notification.2026-04-16T11:00:00.000Z",
			content: {
				sound: "digital_beep.wav",
				data: { source: "other-app", sound: "mid" },
			},
			trigger: { type: "date", date: "2026-04-16T11:00:00.000Z" },
		}
		const fakeClient = createFakeClient({
			permissions: grantedPermissions,
			existing: [...existing, foreignNotification],
		})

		const result = await reconcileNotificationSchedule(fakeClient, settings)

		expect(result.status).toBe("migrated")
		expect(result.canceledIds).toEqual(existing.map((record) => record.identifier))
		expect(fakeClient.canceledIds).not.toContain(foreignNotification.identifier)
		expect(await fakeClient.getAllScheduledNotificationsAsync()).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ identifier: foreignNotification.identifier }),
				expect.objectContaining({ identifier: "hour-beeper.notification.calendar.minute-00" }),
			]),
		)
	})

	it("removes pending notification requests when chimes are disabled", async () => {
		const enabledSettings = {
			...DEFAULT_CHIME_SETTINGS,
			enabled: true,
		}
		const existing = toScheduledRecords(buildNotificationRequests(enabledSettings))
		const fakeClient = createFakeClient({
			permissions: grantedPermissions,
			existing,
		})

		const result = await reconcileNotificationSchedule(fakeClient, {
			...enabledSettings,
			enabled: false,
		})

		expect(result.status).toBe("cleared")
		expect(result.canceledIds).toEqual(existing.map((request) => request.identifier))
		expect(fakeClient.scheduled).toEqual([])
	})

	it("surfaces blocked Android channels without scheduling notifications and clears owned requests", async () => {
		const settings = {
			...DEFAULT_CHIME_SETTINGS,
			enabled: true,
			sound: "low" as const,
		}
		const existing = toScheduledRecords(buildNotificationRequests(settings, { platform: "android" }))
		const fakeClient = createFakeClient({
			permissions: grantedPermissions,
			platform: "android",
			existing,
			androidChannels: [{ id: "hour_beeper_chime_low_v2", importance: 2 }],
		})

		const result = await reconcileNotificationSchedule(fakeClient, settings)

		expect(result.status).toBe("blocked")
		expect(result.permission.status).toBe("blocked")
		expect(result.canceledIds).toEqual(existing.map((request) => request.identifier))
		expect(fakeClient.scheduled).toEqual([])
	})

	it("surfaces denied permission without scheduling notifications and clears owned requests", async () => {
		const settings = {
			...DEFAULT_CHIME_SETTINGS,
			enabled: true,
		}
		const existing = toScheduledRecords(buildNotificationRequests(settings))
		const fakeClient = createFakeClient({
			permissions: { granted: false, status: "denied", canAskAgain: false },
			existing,
		})

		const result = await reconcileNotificationSchedule(fakeClient, settings)

		expect(result.status).toBe("blocked")
		expect(result.permission.status).toBe("denied")
		expect(result.canceledIds).toEqual(existing.map((request) => request.identifier))
		expect(fakeClient.scheduled).toEqual([])
	})

	it("surfaces scheduling failure after cancel and retries the full repeater set deterministically", async () => {
		const nextSettings = {
			...DEFAULT_CHIME_SETTINGS,
			enabled: true,
			schedule: createCustomHoursSchedule([11, 16]),
		}
		const existing = toLegacyDateScheduledRecords(nextSettings, { from, count: 2 })
		const fakeClient = createFakeClient({
			permissions: grantedPermissions,
			existing,
			scheduleFailuresRemaining: 1,
		})

		await expect(reconcileNotificationSchedule(fakeClient, nextSettings)).rejects.toThrow(
			"schedule failed",
		)
		expect(fakeClient.canceledIds).toEqual(existing.map((record) => record.identifier))

		const retry = await reconcileNotificationSchedule(fakeClient, nextSettings)

		expect(retry.status).toBe("scheduled")
		expect(retry.canceledIds).toEqual([])
		expect(fakeClient.scheduled.slice(-2).map((request) => request.identifier)).toEqual([
			"hour-beeper.notification.calendar.11-00",
			"hour-beeper.notification.calendar.16-00",
		])
	})
})

function createFakeNotificationsModule() {
	return {
		SchedulableTriggerInputTypes: {
			CALENDAR: "calendar",
			DAILY: "daily",
			TIME_INTERVAL: "timeInterval",
		},
	} as unknown as Parameters<typeof toExpoTriggerInput>[0]
}

function pluckRequests(requests: HourBeeperNotificationRequest[]) {
	return requests.map((request) => ({
		id: request.identifier,
		slotKey: request.content.data.slotKey,
		triggerType: request.content.data.triggerType,
		trigger: request.trigger,
	}))
}

function toScheduledRecords(requests: HourBeeperNotificationRequest[]): ScheduledNotificationRecord[] {
	return requests.map((request) => ({
		identifier: request.identifier,
		content: request.content,
		trigger: request.trigger,
	}))
}

function toPresentedRecords(
	requests: HourBeeperNotificationRequest[],
	dates: number[],
): PresentedNotificationRecord[] {
	return requests.map((request, index) => ({
		identifier: request.identifier,
		content: request.content,
		trigger: request.trigger,
		date: dates[index] ?? null,
	}))
}

function toLegacyDateScheduledRecords(
	settings: typeof DEFAULT_CHIME_SETTINGS,
	options: { from: DateTime; count: number },
): ScheduledNotificationRecord[] {
	return materializeUpcomingOccurrences(settings.schedule, options).map((occurrence) => {
		const identifier = `hour-beeper.notification.${occurrence.occursAt.toUTC().toISO()}`

		return {
			identifier,
			content: {
				title: "Hour Beeper",
				body: `Chime for ${occurrence.occursAt.toFormat("HH:mm")}`,
				sound: `${settings.sound}-beep.wav`,
				data: {
					source: "hour-beeper",
					occurrenceId: identifier,
					scheduledFor: occurrence.occursAt.toISO(),
					sound: settings.sound,
				},
				threadIdentifier: "hour-beeper.chimes",
				interruptionLevel: "active",
			},
			trigger: {
				type: "date",
				date: occurrence.occursAt.toISO(),
			},
		}
	})
}

function createFakeClient({
	permissions,
	existing = [],
	presented = [],
	scheduleFailuresRemaining = 0,
	platform,
	androidChannels,
}: {
	permissions: Awaited<ReturnType<NotificationClient["getPermissionsAsync"]>>
	existing?: ScheduledNotificationRecord[]
	presented?: PresentedNotificationRecord[]
	scheduleFailuresRemaining?: number
	platform?: NotificationClient["platform"]
	androidChannels?: NonNullable<Awaited<ReturnType<NonNullable<NotificationClient["getAndroidNotificationChannelsAsync"]>>>>
}) {
	const scheduled: HourBeeperNotificationRequest[] = []
	const canceledIds: string[] = []
	const dismissedIds: string[] = []
	const ensuredAndroidChannels: Parameters<NonNullable<NotificationClient["ensureAndroidNotificationChannelsAsync"]>>[0] = []
	const existingState = [...existing]
	const presentedState = [...presented]
	const androidChannelState = androidChannels ? [...androidChannels] : null
	let remainingScheduleFailures = scheduleFailuresRemaining

	const client: NotificationClient & {
		scheduled: HourBeeperNotificationRequest[]
		canceledIds: string[]
		dismissedIds: string[]
		ensuredAndroidChannels: typeof ensuredAndroidChannels
	} = {
		platform,
		scheduled,
		canceledIds,
		dismissedIds,
		ensuredAndroidChannels,
		async ensureAndroidNotificationChannelsAsync(channels) {
			ensuredAndroidChannels.splice(0, ensuredAndroidChannels.length, ...channels)
			if (androidChannelState) {
				return
			}
		},
		async getAndroidNotificationChannelsAsync() {
			return androidChannelState ?? ensuredAndroidChannels.map((channel) => ({
				id: channel.id,
				importance: 6,
			}))
		},
		async getPermissionsAsync() {
			return permissions
		},
		async requestPermissionsAsync() {
			return permissions
		},
		async getAllScheduledNotificationsAsync() {
			return [...existingState]
		},
		async getPresentedNotificationsAsync() {
			return [...presentedState]
		},
		async scheduleNotificationAsync(request) {
			if (remainingScheduleFailures > 0) {
				remainingScheduleFailures -= 1
				throw new Error("schedule failed")
			}

			scheduled.push(request)
			existingState.push({
				identifier: request.identifier,
				content: request.content,
				trigger: request.trigger,
			})
			return request.identifier
		},
		async cancelScheduledNotificationAsync(identifier) {
			canceledIds.push(identifier)
			const nextState = existingState.filter((record) => record.identifier !== identifier)
			existingState.splice(0, existingState.length, ...nextState)
		},
		async dismissNotificationAsync(identifier) {
			dismissedIds.push(identifier)
			const index = presentedState.findIndex((record) => record.identifier === identifier)
			if (index >= 0) {
				presentedState.splice(index, 1)
			}
		},
	}

	return client
}
