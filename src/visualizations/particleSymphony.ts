import {MusicCanvas} from "api"

MusicCanvas.registerVisualization("particle_symphony", {
	info: {
		name: "Particle Symphony",
		author: "Claude 4 Sonnet",
		description: "Dynamic particle system that flows and dances with musical frequencies and beats",
	},
	does: (canvas) => {
		const ctx = canvas.getContext("2d") as CanvasRenderingContext2D
		if (!ctx) throw new Error("Unable to get 2d context for canvas")

		// Particle system
		class Particle {
			x: number
			y: number
			vx: number
			vy: number
			life: number
			maxLife: number
			size: number
			color: string
			frequency: "low" | "mid" | "high"
			trail: Array<{x: number; y: number; alpha: number}>

			constructor(x: number, y: number, frequency: "low" | "mid" | "high") {
				this.x = x
				this.y = y
				this.vx = (Math.random() - 0.5) * 4
				this.vy = (Math.random() - 0.5) * 4
				this.life = 1.0
				this.maxLife = Math.random() * 300 + 100
				this.size = Math.random() * 8 + 2
				this.frequency = frequency
				this.trail = []

				// Color based on frequency
				switch (frequency) {
					case "low":
						this.color = `hsl(${Math.random() * 60 + 300}deg, 80%, 60%)` // Purple-red
						break
					case "mid":
						this.color = `hsl(${Math.random() * 60 + 60}deg, 80%, 60%)` // Yellow-green
						break
					case "high":
						this.color = `hsl(${Math.random() * 60 + 180}deg, 80%, 60%)` // Cyan-blue
						break
				}
			}

			update(dt: number, energyLevel: number, flowField: Array<Array<{x: number; y: number}>>) {
				// Update trail
				this.trail.unshift({x: this.x, y: this.y, alpha: 1.0})
				if (this.trail.length > 15) {
					this.trail.pop()
				}

				// Flow field influence
				const fieldX = Math.floor(this.x / 20)
				const fieldY = Math.floor(this.y / 20)
				if (flowField[fieldY] && flowField[fieldY][fieldX]) {
					const field = flowField[fieldY][fieldX]
					this.vx += field.x * 0.1
					this.vy += field.y * 0.1
				}

				// Energy influence
				const energyInfluence = energyLevel * 2
				this.vx += (Math.random() - 0.5) * energyInfluence
				this.vy += (Math.random() - 0.5) * energyInfluence

				// Apply velocity with damping
				this.x += this.vx * dt * 0.01
				this.y += this.vy * dt * 0.01
				this.vx *= 0.98
				this.vy *= 0.98

				// Boundary wrapping
				if (this.x < 0) this.x = canvas.width
				if (this.x > canvas.width) this.x = 0
				if (this.y < 0) this.y = canvas.height
				if (this.y > canvas.height) this.y = 0

				// Update life
				this.life -= dt / this.maxLife

				// Update trail alpha
				this.trail.forEach((point, i) => {
					point.alpha = ((this.trail.length - i) / this.trail.length) * this.life
				})

				return this.life > 0
			}

			draw() {
				// Draw trail
				for (let i = 1; i < this.trail.length; i++) {
					const prev = this.trail[i - 1]
					const curr = this.trail[i]

					ctx.strokeStyle = this.color.replace("60%)", `60%, ${curr.alpha * 0.3})`)
					ctx.lineWidth = (this.size * curr.alpha) / 2
					ctx.beginPath()
					ctx.moveTo(prev.x, prev.y)
					ctx.lineTo(curr.x, curr.y)
					ctx.stroke()
				}

				// Draw main particle
				const alpha = this.life
				ctx.fillStyle = this.color.replace("60%)", `60%, ${alpha})`)
				ctx.beginPath()
				ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2)
				ctx.fill()

				// Add glow effect
				ctx.shadowColor = this.color
				ctx.shadowBlur = this.size * 2 * alpha
				ctx.beginPath()
				ctx.arc(this.x, this.y, this.size * alpha * 0.5, 0, Math.PI * 2)
				ctx.fill()
				ctx.shadowBlur = 0
			}
		}

		const particles: Particle[] = []
		let backgroundHue = 0
		let flowField: Array<Array<{x: number; y: number}>> = []

		// Initialize flow field
		function updateFlowField(time: number) {
			const cols = Math.ceil(canvas.width / 20)
			const rows = Math.ceil(canvas.height / 20)

			flowField = Array(rows)
				.fill(null)
				.map((_, y) =>
					Array(cols)
						.fill(null)
						.map((_, x) => {
							const angle = Math.sin(x * 0.1 + time * 0.001) + Math.cos(y * 0.1 + time * 0.001)
							return {
								x: Math.cos(angle),
								y: Math.sin(angle),
							}
						})
				)
		}

		// Spawn particles based on music
		function spawnParticles(music: any) {
			if (!music?.segment.current) return

			const segment = music.segment.current
			const spawnCount = Math.floor(segment.perceivedLoudness * 15)

			for (let i = 0; i < spawnCount; i++) {
				const x = Math.random() * canvas.width
				const y = Math.random() * canvas.height

				// Determine frequency based on energy levels
				let frequency: "low" | "mid" | "high"
				if (segment.lowEnergy > segment.midEnergy && segment.lowEnergy > segment.highEnergy) {
					frequency = "low"
				} else if (segment.midEnergy > segment.highEnergy) {
					frequency = "mid"
				} else {
					frequency = "high"
				}

				particles.push(new Particle(x, y, frequency))
			}

			// Limit particle count
			if (particles.length > 500) {
				particles.splice(0, particles.length - 500)
			}
		}

		// Beat-based effects
		function handleBeatEffects(music: any) {
			if (music?.changed.beat && music.beat.current) {
				const intensity = music.beat.current.perceivedLoudness

				// Create burst of particles at beat
				const burstCount = Math.floor(intensity * 20)
				const centerX = canvas.width / 2
				const centerY = canvas.height / 2

				for (let i = 0; i < burstCount; i++) {
					const angle = (Math.PI * 2 * i) / burstCount
					const distance = Math.random() * 100 + 50
					const x = centerX + Math.cos(angle) * distance
					const y = centerY + Math.sin(angle) * distance

					particles.push(new Particle(x, y, "mid"))
				}

				// Shift background hue
				backgroundHue += intensity * 30
			}
		}

		return (dt, music) => {
			const time = performance.now()

			// Clear canvas with fading background
			ctx.fillStyle = `hsla(${backgroundHue % 360}deg, 20%, 5%, 0.1)`
			ctx.fillRect(0, 0, canvas.width, canvas.height)

			// Update flow field
			updateFlowField(time)

			// Handle music-based spawning and effects
			if (music) {
				spawnParticles(music)
				handleBeatEffects(music)
			} else {
				// Default behavior when no music
				if (Math.random() < 0.1) {
					particles.push(new Particle(Math.random() * canvas.width, Math.random() * canvas.height, ["low", "mid", "high"][Math.floor(Math.random() * 3)] as "low" | "mid" | "high"))
				}
			}

			// Get energy levels for particle behavior
			const energyLevel = music?.segment.current?.perceivedLoudness || 0.1

			// Update and draw particles
			for (let i = particles.length - 1; i >= 0; i--) {
				const particle = particles[i]
				if (!particle.update(dt, energyLevel, flowField)) {
					particles.splice(i, 1)
				} else {
					particle.draw()
				}
			}

			// Draw flow field visualization (subtle)
			if (music?.segment.current?.perceivedLoudness > 0.3) {
				ctx.strokeStyle = `hsla(${backgroundHue % 360}deg, 50%, 30%, 0.1)`
				ctx.lineWidth = 1

				for (let y = 0; y < flowField.length; y += 2) {
					for (let x = 0; x < flowField[y].length; x += 2) {
						const field = flowField[y][x]
						const startX = x * 20
						const startY = y * 20
						const endX = startX + field.x * 15
						const endY = startY + field.y * 15

						ctx.beginPath()
						ctx.moveTo(startX, startY)
						ctx.lineTo(endX, endY)
						ctx.stroke()
					}
				}
			}
		}
	},
})
