import { cn } from "@/utils/twHelpers"
import type { Children, ClassName } from "@/utils/types"
import { View } from "react-native"

interface ScreenRootProps extends ClassName {
	safeTop?: boolean
	safeBottom?: boolean
	safe?: boolean
	bare?: boolean
}

function ScreenRoot({
	className,
	children,
	safeTop,
	safeBottom,
	safe,
	bare,
	...restProps
}: Children & ScreenRootProps) {
	return (
		<View
			className={cn(
				"bg-surface-agent-primary flex-1",
				!bare && "px-6",
				safeTop && "pt-safe",
				safeBottom && "pb-safe",
				safe && "py-safe",
				className,
			)}
			{...restProps}
		>
			{children}
		</View>
	)
}

function ScreenOverflow({ className, children }: Children & ClassName) {
	return <View className={cn("-mx-6", className)}>{children}</View>
}

function ScreenPaddingX({ children, small }: Children & { small?: boolean }) {
	return <View className={cn("px-6", small && "px-3")}>{children}</View>
}

export const Screen = Object.assign(ScreenRoot, {
	Overflow: ScreenOverflow,
	PaddingX: ScreenPaddingX,
})
