import { Screen } from "@/components/Screen"
import { Text, View } from "react-native"

export default function HomeScreen() {
  return (
    <Screen safe>
      <View className="flex-1 justify-center gap-3">
        <Text className="text-muted-foreground text-sm font-semibold uppercase tracking-widest">
          Hour Beeper
        </Text>
        <Text className="text-foreground text-4xl leading-10 font-bold">
          A minimal iOS-first hourly chime app.
        </Text>
        <Text className="text-muted-foreground text-lg leading-7">
          The app has been reduced to a single-screen Expo shell. Next units will add the shared
          schedule model, notification delivery, AlarmKit delivery, and dogfooding diagnostics.
        </Text>
      </View>
    </Screen>
  )
}
