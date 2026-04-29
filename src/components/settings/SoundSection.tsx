import { chimeSoundAtom } from "@/features/chime/atoms"
import { CHIME_SOUND_OPTIONS } from "@/features/chime/sounds"
import { useSoundPreview } from "@/features/chime/useSoundPreview"
import { cn } from "@/utils/twHelpers"
import { useAtom } from "jotai"
import { Pressable, Text, View } from "react-native"
import { selectAndPreviewSound } from "./soundSelectionModel"

export function SoundSection() {
	const [sound, setSound] = useAtom(chimeSoundAtom)
	const previewSound = useSoundPreview()

	return (
		<View className="gap-3">
			<Text className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
				Sound
			</Text>

			<View className="bg-card rounded-2xl">
				{CHIME_SOUND_OPTIONS.map((soundOption, index) => {
					const isSelected = sound === soundOption.id

					return (
						<Pressable
							key={soundOption.id}
							accessibilityHint={
								isSelected ? "Plays this sound preview again." : "Selects this sound and plays a preview."
							}
							accessibilityRole="button"
							accessibilityState={{ selected: isSelected }}
							className={cn(
								"flex-row items-center justify-between px-4 py-3",
								index < CHIME_SOUND_OPTIONS.length - 1 && "border-b border-border/50",
							)}
							onPress={() => selectAndPreviewSound(soundOption.id, { setSound, previewSound })}
						>
							<Text className="text-foreground text-base">{soundOption.label}</Text>
							{isSelected && <Text className="text-primary text-base">✓</Text>}
						</Pressable>
					)
				})}
			</View>
		</View>
	)
}
