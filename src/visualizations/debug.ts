import {MusicCanvas} from "../audio/canvas.ts"

MusicCanvas.registerVisualization("chart", {
	info: {
		name: "debug",
		author: "Benjamin Gwynn",
		description: "...",
		rating: 1,
	},
	does: (canvas) => {
		//
		// do setup here
		//
		const ctx = canvas.getContext("2d")
		if (!ctx) throw new Error("Could not create 2D canvas context")

		let frameCount = 0

		ctx.clearRect(0, 0, canvas.width, canvas.height)
		ctx.fillStyle = "black"
		ctx.fillRect(0, 0, canvas.width, canvas.height)

		return (deltaTime, music) => {
			if (!music) return
			//
			// draw stuff here
			//
		}
	},
})
