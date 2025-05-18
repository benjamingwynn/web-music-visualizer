export async function loadMusiq() {
	// todo: code splitting seems broken
	const stuff = await import("musiq")
	console.log("LOADED MUSIQ:", stuff)
	const analyser = await stuff.makeAnalyser({modelUrlRoot: "/musiq"})
	console.log("musiq is ready", analyser)
	return analyser
}
