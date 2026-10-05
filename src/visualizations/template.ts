import {MusicCanvas} from "api"

MusicCanvas.registerVisualization("my-cool-visualizer", {
	// ^ id of visualization
	info: {
		name: "Visualization Template!",
		author: "Your name here!",
		description: "Pick this visualization and press C to start changing the code!",
	},
	does: (canvas) => {
		// set up canvas here, e.g.
		const ctx = canvas.getContext("2d")
		if (!ctx) throw new Error("Error creating 2d canvas context")

		let a = 0
		return (dt, music) => {
			// program what to happen each frame here!

			a += dt
		}
	},
})
