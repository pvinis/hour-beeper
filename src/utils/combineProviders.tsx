import type { Children } from "@/utils/types"
import {
	type ComponentClass,
	type ComponentType,
	type FC,
	type ForwardRefExoticComponent,
	type ReactNode,
} from "react"

type AllowedProvider =
	| FC<Children>
	| FC
	| ComponentClass<{ children: ReactNode }>
	| ComponentType
	| ForwardRefExoticComponent<any>

type FilteredOutProvider = false | undefined

type ProviderList = Array<AllowedProvider | FilteredOutProvider>

const isProvider = (item: AllowedProvider | FilteredOutProvider): item is AllowedProvider => Boolean(item)

export const combineProviders = (list: ProviderList, children: ReactNode) =>
	list.filter(isProvider).reduceRight(
		(acc, Provider) => <Provider>{acc}</Provider>,
		<>{children}</>,
	)
