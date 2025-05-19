import {MusicCanvas} from "../audio/canvas.ts"

MusicCanvas.registerVisualization("spectrum_bloom", {
	info: {
		name: "Spectrum Bloom",
		author: "ChatGPT o4 mini + thinking",
		description:
			"A radial flower that blooms and contracts in response to low, mid, and high energy. " +
			"Low frequencies control the inner ring of petals, mids control the middle ring, " +
			"and highs control the outer ring. Colors shift over time and on strong beats.",
	},
	does: (canvas) => {
		const ctx = canvas.getContext("2d")
		if (!ctx) throw new Error("Could not create 2D canvas context")

		// Number of petals per frequency band
		const petalsPerBand = 20
		const totalPetals = petalsPerBand * 3

		// Maximum length (fraction of min(canvas.width, canvas.height))
		const maxPetalLength = 0.4

		// Keep a hue that drifts slowly over time
		let baseHue = 0

		/** Map a value in [0,1] to a length in pixels. */
		function petalLength(energy: number) {
			// Slight easing so very low energies still have a tiny length
			return energy * energy * maxPetalLength * Math.min(canvas.width, canvas.height)
		}

		return (deltaTime: number, music) => {
			// Clear canvas fully each frame
			ctx.clearRect(0, 0, canvas.width, canvas.height)

			// Advance the base hue slowly (degrees per second)
			baseHue = (baseHue + deltaTime * 20) % 360

			// If there’s no music data yet, just exit
			if (!music || !music.segment.current) {
				return
			}

			// Extract current low/mid/high energies (each is ∈ [0,1])
			const lowE = music.segment.current.lowEnergy
			const midE = music.segment.current.midEnergy
			const highE = music.segment.current.highEnergy

			// If a beat just happened, briefly jump the hue
			if (music.changed.beat && music.beat.current) {
				baseHue = (baseHue + music.beat.current.perceivedLoudness * 50) % 360
			}

			// Compute canvas center
			const cx = canvas.width / 2
			const cy = canvas.height / 2

			// For each petal index, determine which band it belongs to
			for (let i = 0; i < totalPetals; i++) {
				// Angle around circle
				const angle = (i / totalPetals) * Math.PI * 2

				// Determine which “ring” this petal belongs to
				let energy: number
				if (i < petalsPerBand) {
					energy = lowE
				} else if (i < petalsPerBand * 2) {
					energy = midE
				} else {
					energy = highE
				}

				// Compute length in pixels
				const lengthPx = petalLength(energy)

				// Compute end-point of petal
				const x2 = cx + Math.cos(angle) * lengthPx
				const y2 = cy + Math.sin(angle) * lengthPx

				// Color: baseHue plus an offset based on which band & energy
				//   - Low band: hue + 0°
				//   - Mid band: hue + 120°
				//   - High band: hue + 240°
				let hueOffset: number
				if (i < petalsPerBand) {
					hueOffset = 0
				} else if (i < petalsPerBand * 2) {
					hueOffset = 120
				} else {
					hueOffset = 240
				}
				// Further shift by a little depending on how strong the energy is
				const finalHue = (baseHue + hueOffset + energy * 30) % 360

				ctx.strokeStyle = `hsl(${finalHue}, 80%, 60%)`
				ctx.lineWidth = 2 + energy * 3

				ctx.beginPath()
				ctx.moveTo(cx, cy)
				ctx.lineTo(x2, y2)
				ctx.stroke()
			}

			// Optional translucent circle at center that pulses with overall loudness
			if (music.section.current) {
				const avgLoud = music.section.current.perceivedLoudness.avg // ∈ [0,1]
				const radius = 0.05 * Math.min(canvas.width, canvas.height) + avgLoud * 0.15 * Math.min(canvas.width, canvas.height)
				ctx.fillStyle = `hsla(${baseHue}, 100%, 50%, 0.2)`
				ctx.beginPath()
				ctx.arc(cx, cy, radius, 0, Math.PI * 2)
				ctx.fill()
			}
		}
	},
})
