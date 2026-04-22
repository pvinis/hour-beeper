export interface XcdeviceRecord {
	available?: boolean
	identifier?: string
	name?: string
	platform?: string
	simulator?: boolean
}

export interface PhysicalIosDevice {
	identifier: string
	name: string
}

const physicalIosPlatforms = new Set([
	"com.apple.platform.iphoneos",
	"com.apple.platform.ipados",
])

export function parseConnectedPhysicalIosDevices(xcdeviceListOutput: string): PhysicalIosDevice[] {
	const parsed = JSON.parse(xcdeviceListOutput) as unknown

	if (!Array.isArray(parsed)) {
		return []
	}

	return parsed.flatMap((record) => {
		if (!isXcdeviceRecord(record)) {
			return []
		}

		if (
			record.available !== true ||
			record.simulator === true ||
			typeof record.identifier !== "string" ||
			typeof record.name !== "string" ||
			!physicalIosPlatforms.has(record.platform ?? "")
		) {
			return []
		}

		return [{ identifier: record.identifier, name: record.name }]
	})
}

function isXcdeviceRecord(value: unknown): value is XcdeviceRecord {
	return typeof value === "object" && value !== null
}
