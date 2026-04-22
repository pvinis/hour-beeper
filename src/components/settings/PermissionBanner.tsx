import { cn } from "@/utils/twHelpers"
import type { ChimePermissionStatus } from "@/features/chime/types"
import { getPermissionBannerContent } from "./permissionBannerModel"
import { Linking, Pressable, Text, View } from "react-native"

interface PermissionBannerProps {
	notificationStatus: ChimePermissionStatus
	onRequestPermission?: () => void
}

export function PermissionBanner({ notificationStatus, onRequestPermission }: PermissionBannerProps) {
	const banner = getPermissionBannerContent({
		notificationStatus,
	})

	if (!banner) {
		return null
	}

	const isBlocked = banner.tone === "blocked"

	return (
		<View className={cn("rounded-2xl px-4 py-3", isBlocked ? "bg-red-500/10" : "bg-yellow-500/10")}>
			<Text className={cn("text-sm font-semibold", isBlocked ? "text-red-500" : "text-yellow-600")}>
				{banner.title}
			</Text>
			<Text className="text-muted-foreground mt-1 text-xs leading-4">{banner.message}</Text>
			{banner.action === "settings" && (
				<Pressable
					className="bg-primary mt-2 self-start rounded-full px-3 py-1.5"
					onPress={() => void Linking.openSettings()}
				>
					<Text className="text-primary-foreground text-xs font-semibold">{banner.actionLabel}</Text>
				</Pressable>
			)}
			{banner.action === "request" && onRequestPermission && (
				<Pressable
					className="bg-primary mt-2 self-start rounded-full px-3 py-1.5"
					onPress={onRequestPermission}
				>
					<Text className="text-primary-foreground text-xs font-semibold">{banner.actionLabel}</Text>
				</Pressable>
			)}
		</View>
	)
}
