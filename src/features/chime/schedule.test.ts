import { DateTime } from "luxon"
import { describe, expect, it } from "vitest"

import {
	DEFAULT_CHIME_SETTINGS,
	createCustomHoursSchedule,
	materializeUpcomingOccurrences,
	sanitizeChimeSettings,
} from "./schedule"

describe("materializeUpcomingOccurrences", () => {
	it("materializes hourly preset windows anchored to the local clock", () => {
		const schedule = DEFAULT_CHIME_SETTINGS.schedule
		const from = DateTime.fromISO("2026-04-16T10:15:00", { zone: "UTC" })

		const occurrences = materializeUpcomingOccurrences(schedule, { from, count: 4 })

		expect(occurrences.map((occurrence) => occurrence.occursAt.toISO())).toEqual([
			"2026-04-16T11:00:00.000Z",
			"2026-04-16T12:00:00.000Z",
			"2026-04-16T13:00:00.000Z",
			"2026-04-16T14:00:00.000Z",
		])
	})

	it("materializes every minute from the next local minute boundary", () => {
		const schedule = { kind: "preset" as const, preset: "every-minute" as const }
		const from = DateTime.fromISO("2026-04-16T10:17:00", { zone: "UTC" })

		const occurrences = materializeUpcomingOccurrences(schedule, { from, count: 4 })

		expect(occurrences.map((occurrence) => occurrence.occursAt.toISO())).toEqual([
			"2026-04-16T10:18:00.000Z",
			"2026-04-16T10:19:00.000Z",
			"2026-04-16T10:20:00.000Z",
			"2026-04-16T10:21:00.000Z",
		])
	})

	it("materializes only selected custom hours", () => {
		const schedule = createCustomHoursSchedule([11, 16])
		const from = DateTime.fromISO("2026-04-16T10:15:00", { zone: "UTC" })

		const occurrences = materializeUpcomingOccurrences(schedule, { from, count: 4 })

		expect(occurrences.map((occurrence) => occurrence.occursAt.toISO())).toEqual([
			"2026-04-16T11:00:00.000Z",
			"2026-04-16T16:00:00.000Z",
			"2026-04-17T11:00:00.000Z",
			"2026-04-17T16:00:00.000Z",
		])
	})

	it("deduplicates duplicate selected hours", () => {
		const schedule = createCustomHoursSchedule([16, 11, 16, 11])

		expect(schedule.kind).toBe("custom")
		if (schedule.kind !== "custom") {
			throw new Error("expected custom schedule")
		}

		expect(schedule.times).toEqual([
			{ hour: 11, minute: 0 },
			{ hour: 16, minute: 0 },
		])
	})

	it("recalculates schedules correctly after midnight", () => {
		const schedule = createCustomHoursSchedule([0, 23])
		const beforeMidnight = DateTime.fromISO("2026-04-16T23:30:00", { zone: "UTC" })
		const afterMidnight = DateTime.fromISO("2026-04-17T00:30:00", { zone: "UTC" })

		expect(
			materializeUpcomingOccurrences(schedule, { from: beforeMidnight, count: 2 }).map(
				(occurrence) => occurrence.occursAt.toISO(),
			),
		).toEqual(["2026-04-17T00:00:00.000Z", "2026-04-17T23:00:00.000Z"])

		expect(
			materializeUpcomingOccurrences(schedule, { from: afterMidnight, count: 2 }).map(
				(occurrence) => occurrence.occursAt.toISO(),
			),
		).toEqual(["2026-04-17T23:00:00.000Z", "2026-04-18T00:00:00.000Z"])
	})

	it("recalculates future firings against the current local clock after timezone shifts", () => {
		const schedule = createCustomHoursSchedule([9])
		const newYorkNow = DateTime.fromISO("2026-07-01T08:30:00", {
			zone: "America/New_York",
		})
		const losAngelesNow = newYorkNow.setZone("America/Los_Angeles")

		expect(
			materializeUpcomingOccurrences(schedule, { from: newYorkNow, count: 1 })[0]?.occursAt.toISO(),
		).toBe("2026-07-01T09:00:00.000-04:00")

		expect(
			materializeUpcomingOccurrences(schedule, { from: losAngelesNow, count: 1 })[0]?.occursAt.toISO(),
		).toBe("2026-07-01T09:00:00.000-07:00")
	})
})

describe("sanitizeChimeSettings", () => {
	it("falls back to safe defaults for corrupted persisted settings", () => {
		const sanitized = sanitizeChimeSettings({
			enabled: "definitely",
			schedule: { kind: "custom", times: [{ hour: 99, minute: -5 }] },
			sound: "airhorn",
			deliveryMode: "pigeon",
		})

		expect(sanitized).toEqual(DEFAULT_CHIME_SETTINGS)
	})

	it("migrates legacy every-5-minutes settings to every-minute", () => {
		const sanitized = sanitizeChimeSettings({
			enabled: true,
			schedule: { kind: "preset", preset: "every-5-minutes" },
			sound: "mid",
			deliveryMode: "notification",
		})

		expect(sanitized.schedule).toEqual({ kind: "preset", preset: "every-minute" })
		expect(sanitized.sound).toBe("mid")
		expect(sanitized.enabled).toBe(true)
	})

	it("preserves schedule and sound choices when loading legacy AlarmKit-backed settings", () => {
		const schedule = createCustomHoursSchedule([11, 16])
		const sanitized = sanitizeChimeSettings({
			enabled: true,
			schedule,
			sound: "mid",
			deliveryMode: "alarmkit",
		})

		expect(sanitized).toEqual({
			enabled: true,
			schedule,
			sound: "mid",
		})
	})

	it("migrates legacy sound ids to renamed sound ids", () => {
		expect(sanitizeChimeSettings({ ...DEFAULT_CHIME_SETTINGS, sound: "digital" }).sound).toBe("mid")
		expect(sanitizeChimeSettings({ ...DEFAULT_CHIME_SETTINGS, sound: "soft" }).sound).toBe("low")
	})
})
