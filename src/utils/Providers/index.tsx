import { combineProviders } from "@/utils/combineProviders"
import type { Children } from "@/utils/types"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { UniwindSafeAreaListener } from "./UniwindSafeAreaListener"

export function Providers({ children }: Children) {
	return combineProviders(
		[GestureHandlerRootView, SafeAreaProvider, UniwindSafeAreaListener],
		children,
	)
}

export const HighLevelProviders = Providers
