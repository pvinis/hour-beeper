import { combineProviders } from "@/utils/combineProviders"
import type { Children } from "@/utils/types"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { UniwindSafeAreaListener } from "./UniwindSafeAreaListener"

function GestureRoot({ children }: Children) {
  return <GestureHandlerRootView style={{ flex: 1 }}>{children}</GestureHandlerRootView>
}

export function Providers({ children }: Children) {
  return combineProviders([GestureRoot, SafeAreaProvider, UniwindSafeAreaListener], children)
}

export const HighLevelProviders = Providers
