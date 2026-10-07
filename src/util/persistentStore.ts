export async function persistentStore(name: string): Promise<{
	set: (key: string, val: string) => Promise<void>
	get: (key: string) => Promise<string | undefined>
	list: (prefix?: string) => Promise<string[]>
	all: (prefix?: string) => Promise<[string, string][]>
	delete: (key: string) => Promise<void>
	clear: () => Promise<void>
}> {
	const db = await new Promise<IDBDatabase>((resolve, reject) => {
		const req = indexedDB.open(name, 1)
		req.onupgradeneeded = () => req.result.createObjectStore("kv")
		req.onsuccess = () => resolve(req.result)
		req.onerror = () => reject(req.error)
	})

	const rangeFor = (prefix?: string) => (prefix ? IDBKeyRange.bound(prefix, prefix + "\uffff") : undefined)

	return {
		set: (key, val) =>
			new Promise((resolve, reject) => {
				const tx = db.transaction("kv", "readwrite")
				tx.objectStore("kv").put(val, key)
				tx.oncomplete = () => resolve()
				tx.onerror = tx.onabort = () => reject(tx.error)
			}),

		get: (key) =>
			new Promise((resolve, reject) => {
				const req = db.transaction("kv", "readonly").objectStore("kv").get(key)
				req.onsuccess = () => resolve(req.result)
				req.onerror = () => reject(req.error)
			}),

		list: (prefix) =>
			new Promise((resolve, reject) => {
				const req = db.transaction("kv", "readonly").objectStore("kv").getAllKeys(rangeFor(prefix))
				req.onsuccess = () => resolve(req.result as string[])
				req.onerror = () => reject(req.error)
			}),

		all: (prefix) =>
			new Promise((resolve, reject) => {
				const store = db.transaction("kv", "readonly").objectStore("kv")
				const range = rangeFor(prefix)
				const keysReq = store.getAllKeys(range)
				const valsReq = store.getAll(range)
				// both requests share one transaction, so they see the same snapshot
				// and return results in the same (key-sorted) order
				valsReq.onsuccess = () => {
					const keys = keysReq.result as string[]
					const vals = valsReq.result as string[]
					resolve(keys.map((k, i) => [k, vals[i]]))
				}
				keysReq.onerror = valsReq.onerror = () => reject(keysReq.error ?? valsReq.error)
			}),

		delete: (key) =>
			new Promise((resolve, reject) => {
				const tx = db.transaction("kv", "readwrite")
				tx.objectStore("kv").delete(key)
				tx.oncomplete = () => resolve()
				tx.onerror = tx.onabort = () => reject(tx.error)
			}),

		clear: () =>
			new Promise((resolve, reject) => {
				const tx = db.transaction("kv", "readwrite")
				tx.objectStore("kv").clear()
				tx.oncomplete = () => resolve()
				tx.onerror = tx.onabort = () => reject(tx.error)
			}),
	}
}
