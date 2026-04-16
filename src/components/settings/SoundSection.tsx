import { chimeSoundAtom } from "@/features/chime/atoms"
import { CHIME_SOUND_IDS, type ChimeSound } from "@/features/chime/types"
import { cn } from "@/utils/twHelpers"
import { useAtom } from "jotai"
import { Pressable, Text, View } from "react-native"

const SOUND_LABELS: Record<ChimeSound, string> = {
	casio: "Casio",
	classic: "Classic",
	soft: "Soft",
	digital: "Digital",
}

export function SoundSection() {
	const [sound, setSound] = useAtom(chimeSoundAtom)

	return (
		<View className="gap-3">
			<Text className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
				Sound
			</Text>

			<View className="bg-card rounded-2xl">
				{CHIME_SOUND_IDS.map((soundId, index) => (
					<Pressable
						key={soundId}
						className={cn(
							"flex-row items-center justify-between px-4 py-3",
							index < CHIME_SOUND_IDS.length - 1 && "border-b border-border/50",
						)}
						onPress={() => setSound(soundId)}
					>
						<Text className="text-foreground text-base">{SOUND_LABELS[soundId]}</Text>
						{sound === soundId && <Text className="text-primary text-base">✓</Text>}
					</Pressable>
				))}
			</View>
		</View>
	)
}
