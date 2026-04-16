import { DateTime } from "luxon"

import type {
	ChimeSchedule,
	ChimeSettings,
	LocalTime,
	MaterializedChimeOccurrence,
	PresetScheduleId,
} from "./types"
import { CHIME_SOUND_IDS, DELIVERY_MODES, PRESET_SCHEDULE_IDS } from "./types"

const DEFAULT_OCCURRENCE_COUNT = 24
const PRESET_SCHEDULE_ID_SET = new Set<string>(PRESET_SCHEDULE_IDS)
const DELIVERY_MODE_SET = new Set<string>(DELIVERY_MODES)
const CHIME_SOUND_ID_SET = new Set<string>(CHIME_SOUND_IDS)

export const DEFAULT_CHIME_SETTINGS: ChimeSettings = {
	enabled: false,
	schedule: { kind: "preset", preset: "hourly" },
	sound: "casio",
	deliveryMode: "notification",
}

export function createCustomHoursSchedule(hours: number[]): ChimeSchedule {
	const times = normalizeLocalTimes(hours.map((hour) => ({ hour, minute: 0 })))

	if (times.length === 0) {
		return DEFAULT_CHIME_SETTINGS.schedule
	}

	return {
		kind: "custom",
		times,
	}
}

export function materializeUpcomingOccurrences(
	schedule: ChimeSchedule,
	options: {
		from?: DateTime
		count?: number
	} = {},
): MaterializedChimeOccurrence[] {
	const from = options.from ?? DateTime.local()
	const count = Math.max(1, options.count ?? DEFAULT_OCCURRENCE_COUNT)
	const times = getScheduleTimes(schedule)

	if (times.length === 0) {
		return []
	}

	const occurrences: MaterializedChimeOccurrence[] = []
	const dayStart = from.startOf("day")
	const daySearchLimit = Math.max(7, Math.ceil(count / times.length) + 2)

	for (let dayOffset = 0; dayOffset < daySearchLimit && occurrences.length < count; dayOffset += 1) {
		const currentDay = dayStart.plus({ days: dayOffset })

		for (const localTime of times) {
			const occursAt = buildLocalOccurrence(currentDay, localTime)

			if (!occursAt || occursAt.toMillis() <= from.toMillis()) {
				continue
			}

			occurrences.push({
				id: occursAt.toISO() ?? `${currentDay.toISODate()}-${localTime.hour}-${localTime.minute}`,
				occursAt,
				localTime,
			})

			if (occurrences.length >= count) {
				break
			}
		}
	}

	return occurrences
}

export function sanitizeChimeSettings(value: unknown): ChimeSettings {
	if (!isRecord(value)) {
		return DEFAULT_CHIME_SETTINGS
	}

	return {
		enabled: typeof value.enabled === "boolean" ? value.enabled : DEFAULT_CHIME_SETTINGS.enabled,
		schedule: sanitizeSchedule(value.schedule),
		sound: isChimeSound(value.sound) ? value.sound : DEFAULT_CHIME_SETTINGS.sound,
		deliveryMode: isDeliveryMode(value.deliveryMode)
			? value.deliveryMode
			: DEFAULT_CHIME_SETTINGS.deliveryMode,
	}
}

export function getScheduleTimes(schedule: ChimeSchedule): LocalTime[] {
	if (schedule.kind === "custom") {
		return normalizeLocalTimes(schedule.times)
	}

	return getPresetScheduleTimes(schedule.preset)
}

function sanitizeSchedule(value: unknown): ChimeSchedule {
	if (!isRecord(value) || typeof value.kind !== "string") {
		return DEFAULT_CHIME_SETTINGS.schedule
	}

	if (value.kind === "preset") {
		return isPresetScheduleId(value.preset)
			? { kind: "preset", preset: value.preset }
			: DEFAULT_CHIME_SETTINGS.schedule
	}

	if (value.kind === "custom") {
		const candidateTimes = Array.isArray(value.times) ? value.times : []
		const times = normalizeLocalTimes(candidateTimes)

		if (times.length === 0) {
			return DEFAULT_CHIME_SETTINGS.schedule
		}

		return {
			kind: "custom",
			times,
		}
	}

	return DEFAULT_CHIME_SETTINGS.schedule
}

function getPresetScheduleTimes(preset: PresetScheduleId): LocalTime[] {
	switch (preset) {
		case "every-30-minutes":
			return normalizeLocalTimes(
				Array.from({ length: 24 }, (_, hour) => [
					{ hour, minute: 0 },
					{ hour, minute: 30 },
				]).flat(),
			)
		case "hourly":
			return normalizeLocalTimes(Array.from({ length: 24 }, (_, hour) => ({ hour, minute: 0 })))
		case "every-2-hours":
			return normalizeLocalTimes(
				Array.from({ length: 12 }, (_, index) => ({ hour: index * 2, minute: 0 })),
			)
		case "every-4-hours":
			return normalizeLocalTimes(
				Array.from({ length: 6 }, (_, index) => ({ hour: index * 4, minute: 0 })),
			)
	}

	return []
}

function normalizeLocalTimes(candidateTimes: unknown[]): LocalTime[] {
	const uniqueTimes = new Map<string, LocalTime>()

	for (const candidate of candidateTimes) {
		const localTime = sanitizeLocalTime(candidate)

		if (!localTime) {
			continue
		}

		uniqueTimes.set(toLocalTimeKey(localTime), localTime)
	}

	return [...uniqueTimes.values()].sort(compareLocalTimes)
}

function sanitizeLocalTime(value: unknown): LocalTime | null {
	if (!isRecord(value)) {
		return null
	}

	const { hour, minute } = value

	if (typeof hour !== "number" || !Number.isInteger(hour)) {
		return null
	}

	if (typeof minute !== "number" || !Number.isInteger(minute)) {
		return null
	}

	if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
		return null
	}

	return {
		hour,
		minute,
	}
}

function buildLocalOccurrence(day: DateTime, localTime: LocalTime): DateTime | null {
	const occursAt = DateTime.fromObject(
		{
			year: day.year,
			month: day.month,
			day: day.day,
			hour: localTime.hour,
			minute: localTime.minute,
			second: 0,
			millisecond: 0,
		},
		{ zone: day.zoneName ?? undefined },
	)

	if (!occursAt.isValid) {
		return null
	}

	if (occursAt.hour !== localTime.hour || occursAt.minute !== localTime.minute) {
		return null
	}

	return occursAt
}

function compareLocalTimes(left: LocalTime, right: LocalTime) {
	if (left.hour !== right.hour) {
		return left.hour - right.hour
	}

	return left.minute - right.minute
}

function toLocalTimeKey(localTime: LocalTime) {
	return `${localTime.hour}:${localTime.minute}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null
}

function isPresetScheduleId(value: unknown): value is PresetScheduleId {
	return typeof value === "string" && PRESET_SCHEDULE_ID_SET.has(value)
}

function isDeliveryMode(value: unknown): value is ChimeSettings["deliveryMode"] {
	return typeof value === "string" && DELIVERY_MODE_SET.has(value)
}

function isChimeSound(value: unknown): value is ChimeSettings["sound"] {
	return typeof value === "string" && CHIME_SOUND_ID_SET.has(value)
}
