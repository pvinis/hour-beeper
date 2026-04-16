import { atomWithStorage as atomWithStorageOrig, createJSONStorage } from "jotai/utils"
import { Storage } from "expo-sqlite/kv-store"
import type { SyncStringStorage } from "jotai/vanilla/utils/atomWithStorage"

export const atomWithStorage = <T>(key: string, initialValue: T) =>
	atomWithStorageOrig<T>(
		key,
		initialValue,
		createJSONStorage<T>(() => SQLiteStorage),
		{ getOnInit: true },
	)

const SQLiteStorage: SyncStringStorage = {
	getItem: (key: string) => Storage.getItemSync(key),
	setItem: (key: string, value: string) => Storage.setItemSync(key, value),
	removeItem: (key: string) => Storage.removeItemSync(key),
}
