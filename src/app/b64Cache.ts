import {cache} from "./cache.ts"

export async function b64Cache(name: string) {
	const backend = await cache<string>("b64:" + name)
	return {
		get: (id: number) => {
			return backend.get(`${id}`)
		},
		put: (b64Blob: string): number => {
			// find
			let i = 0
			for (const item of backend.values()) {
				if (item === b64Blob) {
					return i
				}
				i++
			}

			// did not find
			const i2 = i
			backend.set(`${i2}`, b64Blob)
			return i2
		},
	}
}
