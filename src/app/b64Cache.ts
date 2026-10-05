import {cache} from "./cache.ts"

export type B64Cache = {
	get: (id: number) => string | undefined
	put: (b64Blob: string) => number
}

const instances = new Map<string, B64Cache>()

export async function b64Cache(name: string) {
	const cached = instances.get(name)
	if (cached) return cached
	const backend = await cache<string>("b64:" + name)

	// reverse index: blob -> id, built from the real keys
	const byValue = new Map<string, number>()
	let nextId = 0
	for (const [k, v] of backend) {
		const id = parseInt(k)
		byValue.set(v, id)
		if (id >= nextId) nextId = id + 1
	}

	const rtn: B64Cache = {
		get: (id: number) => backend.get(`${id}`),
		put: (b64Blob: string): number => {
			const existing = byValue.get(b64Blob)
			if (existing !== undefined) return existing

			const id = nextId++
			backend.set(`${id}`, b64Blob)
			byValue.set(b64Blob, id)
			return id
		},
	}

	instances.set(name, rtn)

	return rtn
}
