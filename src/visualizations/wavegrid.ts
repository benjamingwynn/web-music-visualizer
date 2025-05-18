import {MusicCanvas} from "../audio/canvas.ts"

MusicCanvas.registerVisualization("wavegrid", {
	info: {
		name: "WaveGrid",
		author: "chatgpt 4o",
		description: "A dynamic field of vibrating lines that pulse and ripple with the beat and frequency energy.",
	},
	does: (canvas) => {
		const ctx = canvas.getContext("2d")
		if (!ctx) throw new Error("Could not create 2D canvas context")

		const gridRows = 20
		const gridCols = 40
		const lineSpacingX = 1 / gridCols
		const lineSpacingY = 1 / gridRows
		let time = 0

		const points = Array.from({length: gridRows}, (_, row) =>
			Array.from({length: gridCols}, (_, col) => ({
				baseX: col * lineSpacingX,
				baseY: row * lineSpacingY,
				offset: Math.random() * 100,
			}))
		)

		return (deltaTime, music) => {
			time += deltaTime

			ctx.clearRect(0, 0, canvas.width, canvas.height)
			ctx.lineWidth = 1.5
			ctx.strokeStyle = "magenta"

			const width = canvas.width
			const height = canvas.height

			let beatPulse = 0
			if (music?.changed.beat && music.beat.current) {
				beatPulse = music.beat.current.confidence
			}

			const segment = music?.segment.current
			const low = segment?.lowEnergy ?? 0
			const mid = segment?.midEnergy ?? 0
			const high = segment?.highEnergy ?? 0

			points.forEach((row, rowIndex) => {
				ctx.beginPath()
				row.forEach((point, colIndex) => {
					const x = point.baseX * width
					const y =
						point.baseY * height +
						Math.sin(time * 0.005 + point.offset + colIndex * 0.1) * low * 40 +
						Math.cos(time * 0.008 + point.offset + rowIndex * 0.1) * mid * 30 +
						Math.sin(time * 0.01 + point.offset) * high * 20 +
						beatPulse * 15

					if (colIndex === 0) {
						ctx.moveTo(x, y)
					} else {
						ctx.lineTo(x, y)
					}
				})
				ctx.stroke()
			})
		}
	},
})
