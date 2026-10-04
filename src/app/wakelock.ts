let wakeLock: WakeLockSentinel | null = null

export async function requestWakeLock() {
	if (!("wakeLock" in navigator)) {
		console.warn("Wake Lock API not supported")
		return
	}
	try {
		wakeLock = await navigator.wakeLock.request("screen")
		wakeLock.addEventListener("release", () => console.log("Wake lock released"))
		console.log("got wakelock")
	} catch (err) {
		console.error("[wakelock error]", err)
	}
}

export async function releaseWakeLock() {
	await wakeLock?.release()
	wakeLock = null
}

// The browser releases the lock when the tab is hidden, so re-acquire on return
document.addEventListener("visibilitychange", () => {
	if (document.visibilityState === "visible" && wakeLock === null) {
		requestWakeLock()
	}
})
