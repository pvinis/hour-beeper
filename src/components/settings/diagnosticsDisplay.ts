import type { ChimePermissionStatus } from "@/features/chime/types"

export function formatPermissionStatus(status: ChimePermissionStatus) {
	switch (status) {
		case "granted":
			return "granted"
		case "denied":
			return "denied"
		case "unavailable":
			return "unavailable on this device"
		case "unknown":
			return "not requested yet"
		default:
			return status satisfies never
	}
}
