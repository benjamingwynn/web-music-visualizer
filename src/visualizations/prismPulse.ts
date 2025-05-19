import {MusicCanvas} from "../audio/canvas.ts"

MusicCanvas.registerVisualization("prismPulse", {
	info: {
		name: "PrismPulse",
		author: "ChatGPT o4 mini + thinking",
		description:
			"A dynamic kaleidoscope: on each beat, colorful beams radiate from the center, with their thickness and hue driven by the music’s spectral energy.",
	},
	does: (canvas) => {
		const ctx = canvas.getContext("2d")
		if (!ctx) throw new Error("2D context unavailable")

		const numBeams = 12
		const baseHue = Math.random() * 360
		let rotation = 0

		// map a value from [inMin,inMax] to [outMin,outMax]
		function remap(v: number, inMin: number, inMax: number, outMin: number, outMax: number) {
			return ((v - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin
		}

		return (deltaTime: number, music) => {
			const w = canvas.width,
				h = canvas.height
			ctx.clearRect(0, 0, w, h)

			// slowly spin the whole effect
			rotation += deltaTime * 0.05
			ctx.save()
			ctx.translate(w / 2, h / 2)
			ctx.rotate(rotation)

			// pick spectral energy from the latest segment
			let low = 0,
				mid = 0,
				high = 0
			if (music && music.segment.current) {
				low = music.segment.current.lowEnergy
				mid = music.segment.current.midEnergy
				high = music.segment.current.highEnergy
			}

			// draw beams
			for (let i = 0; i < numBeams; i++) {
				// angle for this beam
				const angle = (i / numBeams) * Math.PI * 2
				// beam thickness varies with mid energy
				const thickness = remap(mid, 0, 1, 5, 50)
				// beam length varies with low energy
				const length = remap(low, 0, 1, h * 0.2, h * 0.9)
				// color hue shifts with high energy
				const hue = (baseHue + remap(high, 0, 1, 0, 120)) % 360

				ctx.save()
				ctx.rotate(angle)
				ctx.beginPath()
				ctx.moveTo(0, 0)
				ctx.lineTo(0, -length)
				ctx.lineWidth = thickness
				ctx.strokeStyle = `hsl(${hue}, 100%, 60%)`
				ctx.stroke()
				ctx.restore()
			}

			ctx.restore()

			// on every beat, quick flash of background glow
			if (music && music.changed.beat && music.beat.current) {
				const glow = remap(music.beat.current.perceivedLoudness, 0, 1, 0.1, 0.4)
				ctx.fillStyle = `rgba(255,255,255,${glow})`
				ctx.fillRect(0, 0, w, h)
			}
		}
	},
})
