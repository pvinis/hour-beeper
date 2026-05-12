import { readFileSync } from "fs"
import { basename } from "path"

import { CHIME_SOUND_OPTIONS } from "../src/features/chime/sounds"

const SAMPLE_WIDTH_BYTES = 2
const INT16_MAX = 32767
const ACTIVE_THRESHOLD_DBFS = -50
const TARGET_ACTIVE_RMS_DBFS = -16
const ACTIVE_RMS_TOLERANCE_DB = 1.25
const PEAK_CEILING_DBFS = -3

interface WavMetrics {
	file: string
	durationSeconds: number
	peakDbfs: number
	fileRmsDbfs: number
	activeRmsDbfs: number
	activeDurationSeconds: number
}

const metrics = CHIME_SOUND_OPTIONS.map((option) =>
	measureWav(`assets/sounds/${option.notificationFilename}`),
)

for (const metric of metrics) {
	console.log(
		[
			basename(metric.file),
			`duration=${metric.durationSeconds.toFixed(3)}s`,
			`active=${metric.activeDurationSeconds.toFixed(3)}s`,
			`peak=${formatDb(metric.peakDbfs)}`,
			`rms=${formatDb(metric.fileRmsDbfs)}`,
			`activeRms=${formatDb(metric.activeRmsDbfs)}`,
		].join(" "),
	)
}

const failures = metrics.flatMap((metric) => validateMetric(metric))
if (failures.length > 0) {
	for (const failure of failures) {
		console.error(failure)
	}
	process.exit(1)
}

function measureWav(file: string): WavMetrics {
	const buffer = readFileSync(file)
	const parsed = parsePcm16Wav(buffer, file)
	const samples = parsed.samples
	const durationSeconds = samples.length / parsed.sampleRate
	const peak = Math.max(...samples.map((sample) => Math.abs(sample)))
	const fileRms = rms(samples)
	const activeSamples = getActiveSamples(samples)
	const activeRms = rms(activeSamples)

	return {
		file,
		durationSeconds,
		peakDbfs: toDbfs(peak),
		fileRmsDbfs: toDbfs(fileRms),
		activeRmsDbfs: toDbfs(activeRms),
		activeDurationSeconds: activeSamples.length / parsed.sampleRate,
	}
}

function validateMetric(metric: WavMetrics) {
	const metricFailures: string[] = []
	const activeRmsDelta = Math.abs(metric.activeRmsDbfs - TARGET_ACTIVE_RMS_DBFS)

	if (!Number.isFinite(metric.activeRmsDbfs)) {
		metricFailures.push(`${metric.file}: no active audio detected`)
	}

	if (metric.peakDbfs > PEAK_CEILING_DBFS) {
		metricFailures.push(
			`${metric.file}: peak ${formatDb(metric.peakDbfs)} exceeds ${formatDb(PEAK_CEILING_DBFS)} ceiling`,
		)
	}

	if (activeRmsDelta > ACTIVE_RMS_TOLERANCE_DB) {
		metricFailures.push(
			`${metric.file}: active RMS ${formatDb(metric.activeRmsDbfs)} is ${activeRmsDelta.toFixed(1)} dB from target ${formatDb(TARGET_ACTIVE_RMS_DBFS)}`,
		)
	}

	return metricFailures
}

function parsePcm16Wav(buffer: Buffer, file: string) {
	if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") {
		throw new Error(`${file}: expected RIFF/WAVE file`)
	}

	let offset = 12
	let sampleRate: number | null = null
	let channels: number | null = null
	let bitsPerSample: number | null = null
	let audioFormat: number | null = null
	let dataChunkStart: number | null = null
	let dataChunkEnd: number | null = null

	while (offset + 8 <= buffer.length) {
		const chunkId = buffer.toString("ascii", offset, offset + 4)
		const chunkSize = buffer.readUInt32LE(offset + 4)
		const chunkStart = offset + 8
		const chunkEnd = chunkStart + chunkSize

		if (chunkEnd > buffer.length) {
			throw new Error(`${file}: invalid WAV chunk ${chunkId}`)
		}

		if (chunkId === "fmt ") {
			audioFormat = buffer.readUInt16LE(chunkStart)
			channels = buffer.readUInt16LE(chunkStart + 2)
			sampleRate = buffer.readUInt32LE(chunkStart + 4)
			bitsPerSample = buffer.readUInt16LE(chunkStart + 14)
		} else if (chunkId === "data") {
			dataChunkStart = chunkStart
			dataChunkEnd = chunkEnd
		}

		offset = chunkEnd + chunkSize % 2
	}

	if (audioFormat !== 1 || bitsPerSample !== 16 || !sampleRate || !channels || dataChunkStart === null || dataChunkEnd === null) {
		throw new Error(`${file}: only PCM 16-bit WAV files are supported`)
	}

	const samples: number[] = []
	for (let index = dataChunkStart; index + SAMPLE_WIDTH_BYTES <= dataChunkEnd; index += SAMPLE_WIDTH_BYTES * channels) {
		let sum = 0
		for (let channel = 0; channel < channels; channel += 1) {
			sum += buffer.readInt16LE(index + channel * SAMPLE_WIDTH_BYTES)
		}
		samples.push(sum / channels)
	}

	return { sampleRate, samples }
}

function getActiveSamples(samples: number[]) {
	const threshold = INT16_MAX * 10 ** (ACTIVE_THRESHOLD_DBFS / 20)
	const firstActive = samples.findIndex((sample) => Math.abs(sample) >= threshold)
	if (firstActive < 0) {
		return []
	}

	let lastActive = samples.length - 1
	while (lastActive > firstActive && Math.abs(samples[lastActive] ?? 0) < threshold) {
		lastActive -= 1
	}

	return samples.slice(firstActive, lastActive + 1)
}

function rms(samples: number[]) {
	if (samples.length === 0) {
		return 0
	}

	return Math.sqrt(samples.reduce((sum, sample) => sum + sample * sample, 0) / samples.length)
}

function toDbfs(value: number) {
	if (value <= 0) {
		return Number.NEGATIVE_INFINITY
	}

	return 20 * Math.log10(value / INT16_MAX)
}

function formatDb(value: number) {
	return Number.isFinite(value) ? `${value.toFixed(1)} dBFS` : "-∞ dBFS"
}
