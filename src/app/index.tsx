import { DeliveryModeSection } from "@/components/settings/DeliveryModeSection"
import { PermissionBanner } from "@/components/settings/PermissionBanner"
import { ScheduleSection } from "@/components/settings/ScheduleSection"
import { SoundSection } from "@/components/settings/SoundSection"
import { chimeEnabledAtom, chimeSettingsAtom } from "@/features/chime/atoms"
import { useChimeReconciliation } from "@/hooks/useChimeReconciliation"
import { Screen } from "@/components/Screen"
import { useAtom, useAtomValue } from "jotai"
import { ScrollView, Switch, Text, View } from "react-native"

export default function HomeScreen() {
	const [enabled, setEnabled] = useAtom(chimeEnabledAtom)
	const settings = useAtomValue(chimeSettingsAtom)
	const {
		notificationPermission,
		alarmkitPermission,
		isReconciling,
		requestPermissions,
	} = useChimeReconciliation()

	return (
		<Screen safe>
			<ScrollView
				className="flex-1"
				showsVerticalScrollIndicator={false}
				contentContainerClassName="gap-5 pb-12 pt-4"
			>
				<View>
					<Text className="text-foreground text-3xl font-bold">Hour Beeper</Text>
					<Text className="text-muted-foreground mt-1 text-sm">
						A brief recurring beep at the times you choose.
					</Text>
				</View>

				<View className="bg-card flex-row items-center justify-between rounded-2xl px-4 py-3">
					<View className="flex-1">
						<Text className="text-foreground text-base font-medium">
							Chimes {enabled ? "On" : "Off"}
						</Text>
						<StatusSummary
							enabled={enabled}
							settings={settings}
							isReconciling={isReconciling}
						/>
					</View>
					<Switch
						value={enabled}
						onValueChange={(value) => {
							setEnabled(value)

							if (value) {
								void requestPermissions()
							}
						}}
					/>
				</View>

				<PermissionBanner
					notificationStatus={notificationPermission}
					alarmkitStatus={alarmkitPermission}
					deliveryMode={settings.deliveryMode}
				/>

				{enabled && (
					<>
						<ScheduleSection />
						<SoundSection />
						<DeliveryModeSection />
					</>
				)}

				{!enabled && (
					<View className="items-center py-12">
						<Text className="text-muted-foreground text-center text-base leading-6">
							Enable chimes to configure your schedule, sound, and delivery mode.
						</Text>
					</View>
				)}
			</ScrollView>
		</Screen>
	)
}

function StatusSummary({
	enabled,
	settings,
	isReconciling,
}: {
	enabled: boolean
	settings: { schedule: { kind: string; preset?: string }; sound: string; deliveryMode: string }
	isReconciling: boolean
}) {
	if (!enabled) {
		return (
			<Text className="text-muted-foreground text-xs">
				No chimes scheduled.
			</Text>
		)
	}

	const scheduleLabel =
		settings.schedule.kind === "preset"
			? settings.schedule.preset?.replace(/-/g, " ") ?? "preset"
			: "custom hours"

	return (
		<Text className="text-muted-foreground text-xs">
			{scheduleLabel} · {settings.sound} · {settings.deliveryMode}
			{isReconciling ? " · syncing…" : ""}
		</Text>
	)
}
