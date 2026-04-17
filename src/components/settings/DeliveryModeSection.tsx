import { deliveryModeAtom } from "@/features/chime/atoms"
import { DELIVERY_MODES, type DeliveryMode } from "@/features/chime/types"
import { cn } from "@/utils/twHelpers"
import { useAtom } from "jotai"
import { Pressable, Text, View } from "react-native"

const MODE_CONFIG: Record<
	DeliveryMode,
	{ label: string; description: string }
> = {
	notification: {
		label: "Notifications",
		description: "Uses local notifications. Subtler — works on all supported iOS versions. Attempts best-effort cleanup, but may still leave visible artifacts.",
	},
	alarmkit: {
		label: "AlarmKit",
		description: "Uses system alarms on iOS 26+. More prominent and reliable — overrides Focus and Silent mode.",
	},
}

interface DeliveryModeSectionProps {
	onModeSelected?: (mode: DeliveryMode) => void
}

export function DeliveryModeSection({ onModeSelected }: DeliveryModeSectionProps) {
	const [deliveryMode, setDeliveryMode] = useAtom(deliveryModeAtom)

	return (
		<View className="gap-3">
			<View>
				<Text className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
					Delivery Mode
				</Text>
				<Text className="text-muted-foreground mt-0.5 text-xs">
					Temporary evaluation switch — compare both on real devices.
				</Text>
			</View>

			<View className="bg-card rounded-2xl">
				{DELIVERY_MODES.map((mode, index) => {
					const config = MODE_CONFIG[mode]
					const isSelected = deliveryMode === mode

					return (
						<Pressable
							key={mode}
							className={cn(
								"px-4 py-3",
								index < DELIVERY_MODES.length - 1 && "border-b border-border/50",
							)}
							onPress={() => {
								if (isSelected) {
									return
								}

								setDeliveryMode(mode)
								onModeSelected?.(mode)
							}}
						>
							<View className="flex-row items-center justify-between">
								<Text className="text-foreground text-base font-medium">
									{config.label}
								</Text>
								{isSelected && <Text className="text-primary text-base">✓</Text>}
							</View>
							<Text className="text-muted-foreground mt-1 text-xs leading-4">
								{config.description}
							</Text>
						</Pressable>
					)
				})}
			</View>
		</View>
	)
}
