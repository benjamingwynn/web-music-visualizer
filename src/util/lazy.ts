import {writable, type Writable} from "svelte/store"

export function lazy<T>(valueWhenNotFinished: T, promiseThatReplacesValue: Promise<T>, alsoFireWhenPromiseResolves?: (v: T) => void): Writable<T> {
	const w = writable(valueWhenNotFinished)
	promiseThatReplacesValue.then((v2) => {
		w.set(v2)
		if (alsoFireWhenPromiseResolves) {
			alsoFireWhenPromiseResolves(v2)
		}
	})
	return w
}
