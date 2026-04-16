import { cn } from "@/utils/twHelpers"
import { Linking, Pressable, Text, View } from "react-native"
import type { ChimePermissionStatus } from "@/features/chime/types"

interface PermissionBannerProps {
	notificationStatus: ChimePermissionStatus
	alarmkitStatus: ChimePermissionStatus
	deliveryMode: "notification" | "alarmkit"
}

export function PermissionBanner({
	notificationStatus,
	alarmkitStatus,
	deliveryMode,
}: PermissionBannerProps) {
	const activeStatus = deliveryMode === "notification" ? notificationStatus : alarmkitStatus
	const isBlocked = activeStatus === "denied"
	const isUnavailable = deliveryMode === "alarmkit" && alarmkitStatus === "unavailable"

	if (!isBlocked && !isUnavailable) {
		return null
	}

	return (
		<View className={cn("rounded-2xl px-4 py-3", isBlocked ? "bg-red-500/10" : "bg-yellow-500/10")}>
			<Text className={cn("text-sm font-semibold", isBlocked ? "text-red-500" : "text-yellow-600")}>
				{isUnavailable
					? "AlarmKit unavailable"
					: `${deliveryMode === "notification" ? "Notification" : "AlarmKit"} permission denied`}
			</Text>
			<Text className="text-muted-foreground mt-1 text-xs leading-4">
				{isUnavailable
					? "AlarmKit requires iOS 26 or later. Notification mode is still available."
					: "Open Settings to grant permission for chimes to work."}
			</Text>
			{isBlocked && (
				<Pressable
					className="bg-primary mt-2 self-start rounded-full px-3 py-1.5"
					onPress={() => void Linking.openSettings()}
				>
					<Text className="text-primary-foreground text-xs font-semibold">Open Settings</Text>
				</Pressable>
			)}
		</View>
	)
}
