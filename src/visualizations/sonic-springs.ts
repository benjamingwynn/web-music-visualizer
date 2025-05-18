import {MusicCanvas} from "../audio/canvas.ts"

MusicCanvas.registerVisualization("sonicSprings", {
	info: {
		name: "SonicSprings",
		author: "chatgpt 4o",
		description: "Vertical spring-like bars bounce to the beat and energy of the music, simulating kinetic movement across the canvas.",
	},
	does: (canvas) => {
		const ctx = canvas.getContext("2d")
		if (!ctx) throw new Error("Could not create 2D canvas context")

		const springCount = 64
		const springs: {
			x: number
			height: number
			velocity: number
			acceleration: number
			targetHeight: number
		}[] = []

		for (let i = 0; i < springCount; i++) {
			springs.push({
				x: i / springCount,
				height: 0.5,
				velocity: 0,
				acceleration: 0,
				targetHeight: 0.5,
			})
		}

		const stiffness = 0.02
		const damping = 0.85
		const baseHeight = 0.5

		return (deltaTime, music) => {
			ctx.clearRect(0, 0, canvas.width, canvas.height)

			// React to music beat and energy
			if (music && music.changed.segment && music.segment.current) {
				const {lowEnergy, midEnergy, highEnergy} = music.segment.current
				for (let i = 0; i < springCount; i++) {
					const energy = i < springCount / 3 ? lowEnergy : i < (2 * springCount) / 3 ? midEnergy : highEnergy

					const force = (energy - 0.5) * 0.5
					springs[i].acceleration += force
				}
			}

			// Simulate and draw springs
			for (const spring of springs) {
				spring.acceleration -= stiffness * (spring.height - baseHeight)
				spring.velocity += spring.acceleration * deltaTime
				spring.velocity *= damping
				spring.height += spring.velocity * deltaTime
				spring.acceleration = 0
			}

			const widthPerSpring = canvas.width / springCount
			for (let i = 0; i < springCount; i++) {
				const s = springs[i]
				const x = i * widthPerSpring
				const h = s.height * canvas.height
				const y = canvas.height - h

				// Gradient effect
				const gradient = ctx.createLinearGradient(x, y, x, canvas.height)
				gradient.addColorStop(0, "deepskyblue")
				gradient.addColorStop(1, "purple")

				ctx.fillStyle = gradient
				ctx.fillRect(x, y, widthPerSpring * 0.8, h)
			}
		}
	},
})
