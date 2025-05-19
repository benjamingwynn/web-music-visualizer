export function pQueue<T>(jobsAtOnce: number) {
	let running = 0
	const queue: (() => Promise<T>)[] = []

	const runNext = () => {
		if (running < jobsAtOnce && queue.length > 0) {
			running++
			const job = queue.shift()!
			job().finally(() => {
				running--
				runNext()
			})
		}
	}

	return (fn: () => Promise<T>): Promise<T> => {
		return new Promise((resolve, reject) => {
			const wrappedFn = async () => {
				try {
					const result = await fn()
					resolve(result)
				} catch (error) {
					reject(error)
				}
			}
			queue.push(wrappedFn)
			runNext()
		})
	}
}
