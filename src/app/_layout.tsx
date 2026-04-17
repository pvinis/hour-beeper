import "@@/global.css"

import {
	configureNotificationRuntime,
	createExpoNotificationClient,
} from "@/features/chime/notificationEngine"
import { HighLevelProviders, Providers } from "@/utils/Providers"
import { Stack, type ErrorBoundaryProps } from "expo-router"
import { useEffect } from "react"
import { Pressable, Text, View } from "react-native"
import { useResolveClassNames } from "uniwind"

export default function RootLayout() {
	const contentStyle = useResolveClassNames("bg-surface-agent-primary")

	useEffect(() => {
		let cleanup: (() => void) | null = null
		let cancelled = false

		void (async () => {
			try {
				const notificationClient = await createExpoNotificationClient()
				const runtimeCleanup = await configureNotificationRuntime(notificationClient)

				if (cancelled) {
					runtimeCleanup()
					return
				}

				cleanup = runtimeCleanup
			} catch (error) {
				console.warn("[RootLayout] Failed to configure notification runtime:", error)
			}
		})()

		return () => {
			cancelled = true
			cleanup?.()
		}
	}, [])

	return (
		<Providers>
			<Stack
				screenOptions={{
					headerShown: false,
					contentStyle,
				}}
			>
				<Stack.Screen name="index" />
			</Stack>
		</Providers>
	)
}

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
	return (
		<HighLevelProviders>
			<View className="bg-surface-agent-primary flex-1 justify-center p-6">
				<View className="bg-card gap-3 rounded-3xl p-5">
					<Text className="text-foreground text-2xl font-bold">
						Something went wrong.
					</Text>
					<Text className="text-muted-foreground text-base leading-6">
						{error.message}
					</Text>
					<Pressable
						className="bg-primary self-start rounded-full px-4 py-2.5"
						onPress={() => void retry()}
					>
						<Text className="text-primary-foreground text-base font-semibold">
							Try again
						</Text>
					</Pressable>
				</View>
			</View>
		</HighLevelProviders>
	)
}
