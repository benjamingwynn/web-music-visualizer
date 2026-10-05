import {MusicCanvas} from "api"

MusicCanvas.registerVisualization("waves", {
	info: {
		name: "Record Wave",
		author: "Benjamin Gwynn",
		description: "A groovy record spins around into waves in beat with the music.",
	},
	does: (canvas) => {
		const ctx = canvas.getContext("2d")
		if (!ctx) throw new Error("Error creating 2d canvas context")

		let targetH = 0,
			h = 0

		let a = 0
		return (dt, music) => {
			ctx.fillStyle = "rgba(0,0,0,0.08)"
			ctx.fillRect(0, 0, canvas.width, canvas.height)

			const pix = canvas.width / 4000

			const cX = canvas.width / 2
			const cY = canvas.height / 2

			// make the square bigger when the beat hits
			const size = (music?.segment?.current?.perceivedLoudness ?? 0) * 100 + (music?.changed.beat ? (music?.beat.current?.perceivedLoudness ?? 0) : 0) * 200

			// figure out which key has most confidence
			const maxConf = music?.section.current?.keys.reduce((acc, v) => (v > acc ? v : acc), 0)
			const k = music?.section.current?.keys.findIndex((x) => x === maxConf) ?? 0
			targetH = (k / 24) * 360 + 120 + (music?.section?.current?.index ?? 0) * 31
			const H_RATE = 0.04
			if (h < targetH) {
				h += H_RATE * dt
			} else if (h > targetH) {
				h -= H_RATE * dt
			}
			ctx.strokeStyle = `hsl(${h % 360}deg, 82%, 59%)`

			ctx.beginPath()

			ctx.lineWidth = pix * 12 * Math.max(0.05, music?.segment?.current?.perceivedLoudness ?? 1)

			const spectrum = music?.segment.current?.spectrum ?? []
			for (let w = 0; w < 24; w++) {
				const radius = size + w * 100 * pix
				const waves = 10
				const phase = -a * 0.01
				const amplitude = 20 * (Math.min(5, w) + 1) * (spectrum[w] ?? 0.05) * pix
				const steps = 300

				for (let i = 0; i <= steps; i++) {
					const angle = (i / steps) * Math.PI * 2

					const r = radius + Math.sin(angle * waves + phase) * amplitude

					const x = cX + Math.cos(angle) * r
					const y = cY + Math.sin(angle) * r

					if (i === 0) {
						ctx.moveTo(x, y)
					} else {
						ctx.lineTo(x, y)
					}
				}
			}

			ctx.closePath()
			ctx.stroke()

			// make the square spin faster when the music is
			a += dt * ((music?.section.current?.bpm.avg ?? 160) / 160)
		}
	},
})
