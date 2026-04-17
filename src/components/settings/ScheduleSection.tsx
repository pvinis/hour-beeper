import { chimeScheduleAtom } from "@/features/chime/atoms"
import { PRESET_SCHEDULE_IDS, type ChimeSchedule, type PresetScheduleId } from "@/features/chime/types"
import { cn } from "@/utils/twHelpers"
import { useAtom } from "jotai"
import { useState } from "react"
import { Pressable, Text, View } from "react-native"

const PRESET_LABELS: Record<PresetScheduleId, string> = {
	"every-5-minutes": "Every 5 min",
	"every-30-minutes": "Every 30 min",
	hourly: "Hourly",
	"every-2-hours": "Every 2 hours",
	"every-4-hours": "Every 4 hours",
}

const ALL_HOURS = Array.from({ length: 24 }, (_, index) => index)

export function ScheduleSection() {
	const [schedule, setSchedule] = useAtom(chimeScheduleAtom)
	const [showCustom, setShowCustom] = useState(schedule.kind === "custom")

	return (
		<View className="gap-3">
			<Text className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
				Schedule
			</Text>

			<View className="bg-card rounded-2xl">
				{PRESET_SCHEDULE_IDS.map((preset) => (
					<Pressable
						key={preset}
						className={cn(
							"flex-row items-center justify-between border-b border-border/50 px-4 py-3",
							preset === PRESET_SCHEDULE_IDS[PRESET_SCHEDULE_IDS.length - 1] && !showCustom && "border-b-0",
						)}
						onPress={() => {
							setSchedule({ kind: "preset", preset })
							setShowCustom(false)
						}}
					>
						<Text className="text-foreground text-base">{PRESET_LABELS[preset]}</Text>
						{schedule.kind === "preset" && schedule.preset === preset && !showCustom && (
							<Text className="text-primary text-base">✓</Text>
						)}
					</Pressable>
				))}

				<Pressable
					className="flex-row items-center justify-between px-4 py-3"
					onPress={() => {
						setShowCustom(true)
						if (schedule.kind !== "custom") {
							setSchedule({ kind: "custom", times: [{ hour: 9, minute: 0 }] })
						}
					}}
				>
					<Text className="text-foreground text-base">Custom hours</Text>
					{showCustom && <Text className="text-primary text-base">✓</Text>}
				</Pressable>
			</View>

			{showCustom && schedule.kind === "custom" && (
				<CustomHoursPicker schedule={schedule} setSchedule={setSchedule} />
			)}
		</View>
	)
}

function CustomHoursPicker({
	schedule,
	setSchedule,
}: {
	schedule: Extract<ChimeSchedule, { kind: "custom" }>
	setSchedule: (schedule: ChimeSchedule) => void
}) {
	const selectedHours = new Set(schedule.times.map((time) => time.hour))

	function toggleHour(hour: number) {
		const next = new Set(selectedHours)

		if (next.has(hour)) {
			next.delete(hour)
		} else {
			next.add(hour)
		}

		if (next.size === 0) {
			return
		}

		setSchedule({
			kind: "custom",
			times: [...next].sort((a, b) => a - b).map((h) => ({ hour: h, minute: 0 })),
		})
	}

	return (
		<View className="bg-card rounded-2xl p-3">
			<View className="flex-row flex-wrap gap-2">
				{ALL_HOURS.map((hour) => {
					const isSelected = selectedHours.has(hour)

					return (
						<Pressable
							key={hour}
							className={cn(
								"h-10 w-12 items-center justify-center rounded-lg",
								isSelected ? "bg-primary" : "bg-muted",
							)}
							onPress={() => toggleHour(hour)}
						>
							<Text
								className={cn(
									"text-sm font-semibold",
									isSelected ? "text-primary-foreground" : "text-muted-foreground",
								)}
							>
								{hour.toString().padStart(2, "0")}
							</Text>
						</Pressable>
					)
				})}
			</View>
		</View>
	)
}
