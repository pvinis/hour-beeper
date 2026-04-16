import { atomWithStorage as atomWithStorageOrig, createJSONStorage } from "jotai/utils"
import { Storage } from "expo-sqlite/kv-store"
import type {
	SyncStorage,
	SyncStringStorage,
} from "jotai/vanilla/utils/atomWithStorage"

interface AtomWithStorageOptions<T> {
	getOnInit?: boolean
	sanitize?: (value: unknown) => T
}

export const atomWithStorage = <T>(
	key: string,
	initialValue: T,
	options: AtomWithStorageOptions<T> = {},
) =>
	atomWithStorageOrig(
		key,
		initialValue,
		createStorage(options.sanitize),
		{ getOnInit: options.getOnInit ?? true },
	)

function createStorage<T>(sanitize?: (value: unknown) => T): SyncStorage<T> {
	if (!sanitize) {
		return createJSONStorage<T>(() => SQLiteStorage)
	}

	const storage = createJSONStorage<unknown>(() => SQLiteStorage)

	return {
		getItem: (key, initialValue) => sanitize(storage.getItem(key, initialValue)),
		setItem: (key, newValue) => storage.setItem(key, newValue),
		removeItem: (key) => storage.removeItem(key),
		subscribe: storage.subscribe
			? (key, callback, initialValue) =>
					storage.subscribe?.(key, (value) => callback(sanitize(value)), initialValue)
			: undefined,
	}
}

const SQLiteStorage: SyncStringStorage = {
	getItem: (key: string) => Storage.getItemSync(key),
	setItem: (key: string, value: string) => Storage.setItemSync(key, value),
	removeItem: (key: string) => Storage.removeItemSync(key),
}
