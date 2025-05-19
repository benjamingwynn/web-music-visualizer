import {MusicCanvas} from "../audio/canvas.ts"

MusicCanvas.registerVisualization("starlight_drift", {
	info: {
		name: "Starlight Drift",
		author: "chatgpt 4o",
		description: "Glowing stardust particles drift through space and shimmer with the music's energy and frequency balance.",
	},
	does: (canvas) => {
		const ctx = canvas.getContext("2d")
		if (!ctx) throw new Error("Could not create 2D canvas context")

		const particleCount = 100
		const baseSpeed = 0.00005
		const avDecay = 0.96

		function rand(min: number, max: number): number {
			return Math.random() * (max - min) + min
		}

		class Particle {
			x = Math.random()
			y = Math.random()
			size = rand(0.005, 0.015)
			alpha = rand(0.3, 1)
			speed = rand(baseSpeed, baseSpeed * 5)
			angle = rand(0, 2 * Math.PI)
			avx = 0
			avy = 0
			hue = rand(180, 280)

			tick(dT: number) {
				const dx = Math.cos(this.angle) * this.speed
				const dy = Math.sin(this.angle) * this.speed

				this.x += (dx + this.avx) * dT
				this.y += (dy + this.avy) * dT

				this.avx *= Math.pow(avDecay, dT)
				this.avy *= Math.pow(avDecay, dT)

				// wrap around
				if (this.x > 1) this.x = 0
				if (this.x < 0) this.x = 1
				if (this.y > 1) this.y = 0
				if (this.y < 0) this.y = 1
			}
		}

		const particles = Array.from({length: particleCount}, () => new Particle())

		return (deltaTime, music) => {
			ctx.clearRect(0, 0, canvas.width, canvas.height)

			for (const p of particles) {
				// react to beat and energy
				if (music && music.changed.segment && music.segment.current) {
					const {lowEnergy, midEnergy, highEnergy} = music.segment.current
					p.avx += (Math.random() - 0.5) * 0.002 * (lowEnergy + midEnergy)
					p.avy += (Math.random() - 0.5) * 0.002 * (midEnergy + highEnergy)
					p.alpha = 0.4 + 0.6 * Math.min(1, music.segment.current.perceivedLoudness)
				}

				const screenX = p.x * canvas.width
				const screenY = p.y * canvas.height
				const radius = p.size * Math.min(canvas.width, canvas.height)

				ctx.beginPath()
				ctx.arc(screenX, screenY, radius, 0, Math.PI * 2)
				ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${p.alpha})`
				ctx.fill()
			}

			particles.forEach((p) => p.tick(deltaTime))
		}
	},
})
