import {MusicCanvas} from "../audio/canvas.ts"

MusicCanvas.registerVisualization("cosmicHarmony", {
	info: {
		name: "Cosmic Harmony",
		author: "Claude 3.7 Sonnet",
		description: "A celestial visualization where particles form constellations and galaxies that react to music dynamics",
	},
	does: (canvas) => {
		const ctx = canvas.getContext("2d")
		if (!ctx) throw new Error("Could not create 2D canvas context")

		// Helper functions
		function rand(min: number, max: number): number {
			return Math.random() * (max - min) + min
		}

		function randInt(min: number, max: number): number {
			return Math.floor(rand(min, max))
		}

		function randSign(): 1 | -1 {
			return Math.random() < 0.5 ? -1 : 1
		}

		// Color palettes for different moods
		const colorPalettes = {
			calm: ["#1a237e", "#283593", "#3949ab", "#5c6bc0", "#7986cb"],
			energetic: ["#b71c1c", "#c62828", "#d32f2f", "#e53935", "#f44336"],
			mystical: ["#4a148c", "#6a1b9a", "#7b1fa2", "#8e24aa", "#9c27b0"],
		}

		let currentPalette = colorPalettes.calm
		let backgroundAlpha = 0.1
		let currentRotation = 0

		// Stars that form constellations
		class Star {
			x: number
			y: number
			baseX: number
			baseY: number
			size: number
			brightness: number
			baseBrightness: number
			pulseSpeed: number
			connections: Star[]
			color: string
			rotation: number

			constructor() {
				this.baseX = this.x = rand(0, 1)
				this.baseY = this.y = rand(0, 1)
				this.size = rand(0.002, 0.01)
				this.baseBrightness = this.brightness = rand(0.3, 1)
				this.pulseSpeed = rand(0.001, 0.005)
				this.connections = []
				this.color = currentPalette[randInt(0, currentPalette.length)]
				this.rotation = 0
			}

			pulse(intensity: number) {
				this.brightness = this.baseBrightness + intensity * rand(0.2, 0.5)
				this.size = Math.max(0.002, Math.min(0.015, this.size + intensity * 0.005))
			}

			update(deltaTime: number, intensity: number, centerX: number, centerY: number) {
				// Orbit around center with varying speed based on music intensity
				const distanceFromCenter = Math.sqrt(Math.pow(this.baseX - centerX, 2) + Math.pow(this.baseY - centerY, 2))

				const orbitSpeed = (0.0001 + intensity * 0.0005) / Math.max(0.1, distanceFromCenter)
				this.rotation += orbitSpeed * deltaTime

				// Calculate new position based on orbit
				this.x = this.baseX + Math.sin(this.rotation) * intensity * 0.1
				this.y = this.baseY + Math.cos(this.rotation) * intensity * 0.1

				// Pulse with the music
				this.pulse(intensity)
			}

			draw(ctx: CanvasRenderingContext2D, width: number, height: number) {
				const x = this.x * width
				const y = this.y * height
				const actualSize = this.size * Math.min(width, height)

				// Draw connections (constellation lines)
				ctx.lineWidth = Math.max(0.5, actualSize / 3)
				for (const connection of this.connections) {
					const connX = connection.x * width
					const connY = connection.y * height

					ctx.beginPath()
					ctx.moveTo(x, y)
					ctx.lineTo(connX, connY)
					ctx.strokeStyle = `rgba(255, 255, 255, ${this.brightness * 0.2})`
					ctx.stroke()
				}

				// Draw star
				ctx.beginPath()
				ctx.arc(x, y, actualSize, 0, Math.PI * 2)
				ctx.fillStyle = this.color
				ctx.fill()

				// Draw glow
				const gradient = ctx.createRadialGradient(x, y, 0, x, y, actualSize * 4)
				gradient.addColorStop(0, `rgba(255, 255, 255, ${this.brightness * 0.8})`)
				gradient.addColorStop(1, "rgba(255, 255, 255, 0)")

				ctx.beginPath()
				ctx.arc(x, y, actualSize * 4, 0, Math.PI * 2)
				ctx.fillStyle = gradient
				ctx.fill()
			}
		}

		// Galaxy clusters that respond to sections
		class GalaxyCluster {
			x: number
			y: number
			size: number
			rotation: number
			rotationSpeed: number
			particles: {distance: number; angle: number; size: number; color: string}[]

			constructor(x: number, y: number) {
				this.x = x
				this.y = y
				this.size = rand(0.1, 0.25)
				this.rotation = rand(0, Math.PI * 2)
				this.rotationSpeed = rand(0.00005, 0.0001)
				this.particles = []

				// Create galaxy particles
				const particleCount = randInt(50, 150)
				for (let i = 0; i < particleCount; i++) {
					const angle = rand(0, Math.PI * 2)
					const armOffset = Math.sin(angle * 3) * 0.1
					const distance = rand(0.01, 0.9) + armOffset

					this.particles.push({
						distance,
						angle,
						size: rand(0.001, 0.004),
						color: currentPalette[randInt(0, currentPalette.length)],
					})
				}
			}

			update(deltaTime: number, intensity: number) {
				this.rotation += this.rotationSpeed * deltaTime * (1 + intensity * 5)
			}

			draw(ctx: CanvasRenderingContext2D, width: number, height: number, intensity: number) {
				const x = this.x * width
				const y = this.y * height
				const actualSize = this.size * Math.min(width, height)

				ctx.save()
				ctx.translate(x, y)
				ctx.rotate(this.rotation)

				for (const particle of this.particles) {
					const particleX = Math.cos(particle.angle) * particle.distance * actualSize
					const particleY = Math.sin(particle.angle) * particle.distance * actualSize
					const particleSize = particle.size * Math.min(width, height) * (1 + intensity)

					ctx.beginPath()
					ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2)
					ctx.fillStyle = particle.color
					ctx.fill()
				}

				ctx.restore()
			}
		}

		// Initialize stars and create constellations
		const stars: Star[] = Array.from({length: 100}, () => new Star())

		// Connect stars to form constellations
		for (let i = 0; i < stars.length; i++) {
			const star = stars[i]
			const possibleConnections = stars.filter((otherStar) => {
				if (otherStar === star) return false

				const distance = Math.sqrt(Math.pow(star.x - otherStar.x, 2) + Math.pow(star.y - otherStar.y, 2))

				return distance < 0.15
			})

			// Connect to closest 0-2 stars
			const connectCount = randInt(0, 3)
			for (let j = 0; j < Math.min(connectCount, possibleConnections.length); j++) {
				star.connections.push(possibleConnections[j])
			}
		}

		// Create galaxy clusters
		const galaxies = [new GalaxyCluster(0.3, 0.3), new GalaxyCluster(0.7, 0.7), new GalaxyCluster(0.2, 0.8)]

		// Variables to track music features
		let currentEnergy = 0
		let currentBpm = 0
		let bassEnergy = 0
		let midEnergy = 0
		let highEnergy = 0
		let beatCount = 0

		// Fade-in/fade-out transitions
		let transitionTimer = 0
		const transitionDuration = 5000 // ms

		return (deltaTime, music) => {
			// Apply music data when available
			if (music) {
				// Track energy changes from segments
				if (music.segment.current) {
					bassEnergy = music.segment.current.lowEnergy * 2
					midEnergy = music.segment.current.midEnergy * 1.5
					highEnergy = music.segment.current.highEnergy

					currentEnergy = music.segment.current.perceivedLoudness
				}

				// Track section changes
				if (music.changed.section && music.section.current) {
					const newEnergy = music.section.current.perceivedLoudness.avg

					// Change color palette based on energy level
					if (newEnergy > 0.7) {
						currentPalette = colorPalettes.energetic
					} else if (newEnergy > 0.4) {
						currentPalette = colorPalettes.mystical
					} else {
						currentPalette = colorPalettes.calm
					}

					// Start color transition
					transitionTimer = transitionDuration

					// Update BPM
					currentBpm = music.section.current.bpm.avg
				}

				// Track beats
				if (music.changed.beat && music.beat.current) {
					beatCount++

					// Pulse on beat
					const beatIntensity = music.beat.current.perceivedLoudness

					// Apply beat effects
					backgroundAlpha = 0.05 + beatIntensity * 0.15
					currentRotation += beatIntensity * 0.05
				}
			}

			// Update transition timer
			if (transitionTimer > 0) {
				transitionTimer -= deltaTime
			}

			// Clear canvas with fading background
			ctx.fillStyle = `rgba(0, 0, 0, ${backgroundAlpha})`
			ctx.fillRect(0, 0, canvas.width, canvas.height)

			// Apply global rotation
			ctx.save()
			ctx.translate(canvas.width / 2, canvas.height / 2)
			ctx.rotate(currentRotation)
			ctx.translate(-canvas.width / 2, -canvas.height / 2)

			// Draw galaxies
			for (const galaxy of galaxies) {
				galaxy.update(deltaTime, currentEnergy)
				galaxy.draw(ctx, canvas.width, canvas.height, currentEnergy)
			}

			// Draw stars and constellations
			for (const star of stars) {
				star.update(deltaTime, currentEnergy, 0.5, 0.5)
				star.draw(ctx, canvas.width, canvas.height)
			}

			// Draw cosmic particles in the upper frequencies
			if (highEnergy > 0.3) {
				const particleCount = Math.floor(highEnergy * 20)
				for (let i = 0; i < particleCount; i++) {
					const x = rand(0, canvas.width)
					const y = rand(0, canvas.height)
					const size = rand(1, 3) * highEnergy

					ctx.beginPath()
					ctx.arc(x, y, size, 0, Math.PI * 2)
					ctx.fillStyle = `rgba(255, 255, 255, ${highEnergy * 0.7})`
					ctx.fill()
				}
			}

			// Draw bass response as ripples
			if (bassEnergy > 0.4) {
				const rippleCount = Math.floor(bassEnergy * 3)
				for (let i = 0; i < rippleCount; i++) {
					const x = rand(0, canvas.width)
					const y = rand(0, canvas.height)
					const maxRadius = bassEnergy * 50

					ctx.beginPath()
					ctx.arc(x, y, maxRadius, 0, Math.PI * 2)
					ctx.strokeStyle = `rgba(255, 255, 255, ${bassEnergy * 0.2})`
					ctx.lineWidth = 2
					ctx.stroke()

					ctx.beginPath()
					ctx.arc(x, y, maxRadius * 0.7, 0, Math.PI * 2)
					ctx.strokeStyle = `rgba(255, 255, 255, ${bassEnergy * 0.1})`
					ctx.lineWidth = 1
					ctx.stroke()
				}
			}

			ctx.restore()
		}
	},
})
