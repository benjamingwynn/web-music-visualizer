import {MusicCanvas} from "api"

MusicCanvas.registerVisualization("chart", {
	info: {
		name: "chart",
		author: "Benjamin Gwynn",
		description: "draws the value of music metrics",
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
			const alpha = (1 / canvas.width) * 8
			ctx.fillStyle = "rgba(0,0,0," + alpha + ")"
			ctx.fillRect(0, 0, canvas.width, canvas.height)

			const data: [string, number][] = [
				["cyan", music.segment.current.perceivedLoudness],
				// ['rgba(0,255,0,0.3)', music.segment.current.rmsEnergy],
				// ['rgba(0,0,255,0.3)', music.segment.current.deltaRms],
			]

			for (const [color, value] of data) {
				ctx.fillStyle = color
				ctx.fillRect(frameCount, canvas.height - canvas.height * value, 1, canvas.height * value)
			}

			frameCount++

			if (frameCount > canvas.width) {
				frameCount = 0
			}
		}
	},
})
