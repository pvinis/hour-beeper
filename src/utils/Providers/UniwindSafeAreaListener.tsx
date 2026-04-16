import type { Children } from "@/utils/types"
import { SafeAreaListener as SafeAreaListenerOrig } from "react-native-safe-area-context"
import { Uniwind } from "uniwind"

export function UniwindSafeAreaListener({ children }: Children) {
  return (
    <SafeAreaListenerOrig
      onChange={({ insets }) => {
        Uniwind.updateInsets(insets)
      }}
    >
      {children}
    </SafeAreaListenerOrig>
  )
}
