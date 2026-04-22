import Constants from "expo-constants"
import { useAtomValue } from "jotai"
import { useState } from "react"
import { Pressable, Text, View } from "react-native"

import { formatReconciliationStatus, formatRepeaterCount } from "@/features/chime/diagnostics"
import { diagnosticsAtom } from "@/storage/persist"
import { formatPermissionStatus } from "./diagnosticsDisplay"

export function DiagnosticsSection() {
	const diagnostics = useAtomValue(diagnosticsAtom)
	const [expanded, setExpanded] = useState(false)

	const appVersion = Constants.expoConfig?.version ?? "unknown"
	const gitCommitRaw = Constants.expoConfig?.extra?.gitCommit
	const gitCommit = typeof gitCommitRaw === "string" ? gitCommitRaw : "unknown"

	return (
		<View className="gap-3">
			<Pressable onPress={() => setExpanded((prev) => !prev)}>
				<Text className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
					Diagnostics {expanded ? "▼" : "▶"}
				</Text>
			</Pressable>

			<View className="bg-card rounded-2xl px-4 py-3">
				<DiagnosticRow label="Version" value={`${appVersion} (${gitCommit})`} />
				<DiagnosticRow
					label="Notification permission"
					value={formatPermissionStatus(diagnostics.notificationPermission)}
				/>
				<DiagnosticRow
					label="Last reconciled"
					value={
						diagnostics.lastReconciledAt
							? new Date(diagnostics.lastReconciledAt).toLocaleString()
							: "never"
					}
				/>
				<DiagnosticRow
					label="Scheduled repeaters"
					value={formatRepeaterCount(diagnostics.lastScheduledArtifactCount)}
				/>

				{diagnostics.lastError && (
					<View className="mt-2 rounded-lg bg-red-500/10 px-3 py-2">
						<Text className="text-xs text-red-500">{diagnostics.lastError}</Text>
					</View>
				)}
			</View>

			{expanded && diagnostics.history.length > 0 && (
				<View className="bg-card rounded-2xl px-4 py-3">
					<Text className="text-muted-foreground mb-2 text-xs font-semibold uppercase">
						Recent reconciliations
					</Text>
					{diagnostics.history.slice(0, 10).map((entry, index) => (
						<View
							key={`${entry.timestamp}-${index}`}
							className="border-b border-border/30 py-1.5 last:border-b-0"
						>
							<Text className="text-foreground text-xs">
								{formatReconciliationStatus(entry.status)}
								{entry.artifactCount != null ? ` · ${formatRepeaterCount(entry.artifactCount)}` : ""}
							</Text>
							<Text className="text-muted-foreground text-xs">
								{new Date(entry.timestamp).toLocaleString()}
							</Text>
						</View>
					))}
				</View>
			)}
		</View>
	)
}

function DiagnosticRow({ label, value }: { label: string; value: string }) {
	return (
		<View className="flex-row items-center justify-between py-1">
			<Text className="text-muted-foreground text-xs">{label}</Text>
			<Text className="text-foreground text-xs font-medium">{value}</Text>
		</View>
	)
}
