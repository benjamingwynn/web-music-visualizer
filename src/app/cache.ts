import {persistentStore} from "./persistentStore.ts"

/** debug option to entirely disable caching */
const DISABLE_CACHING = true

const cacheCache: Map<string, any> = new Map()

export async function cache<T>(name: string): Promise<Map<string, T>> {
	const cached = cacheCache.get(name)
	if (cached) return cached
	if (DISABLE_CACHING) {
		const map = new Map<string, T>()
		cacheCache.set(name, map)
		return map
	}

	const store = await persistentStore("cache:" + name)
	const map = new Map<string, T>((await store.all()).map(([k, v]) => [k, JSON.parse(v)]))

	const origSet = map.set.bind(map)
	const origDelete = map.delete.bind(map)
	const origClear = map.clear.bind(map)

	const onError = (e: unknown) => console.error(`cache "${name}" write failed`, e)

	map.set = (k, v) => {
		store.set(k, JSON.stringify(v)).catch(onError)
		return origSet(k, v)
	}
	map.delete = (k) => {
		store.delete(k).catch(onError)
		return origDelete(k)
	}
	map.clear = () => {
		store.clear().catch(onError)
		origClear()
	}

	cacheCache.set(name, map)
	return map
}
