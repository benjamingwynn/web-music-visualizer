import {MusicCanvas} from "../audio/canvas.ts"

MusicCanvas.registerVisualization("cosmic-soundscape", {
	info: {
		name: "Cosmic Soundscape",
		author: "Claude 3.7 Sonnet",
		description: "A reactive galaxy of particles that forms constellations based on music patterns and energy",
	},
	does: (canvas) => {
		const ctx = canvas.getContext("2d")
		if (!ctx) throw new Error("Could not create 2D canvas context")

		// Constants
		const MAX_PARTICLES = 200
		const BASE_PARTICLE_SIZE = 0.008
		const CONSTELLATION_THRESHOLD = 0.15
		const ENERGY_DECAY = 0.97
		const COLOR_SHIFT_RATE = 0.01

		// Utility functions
		const rand = (min: number, max: number): number => Math.random() * (max - min) + min
		const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value))

		// Color utilities
		const hslToRgb = (h: number, s: number, l: number): string => {
			h = h % 360
			return `hsl(${h}, ${s * 100}%, ${l * 100}%)`
		}

		// Create particle system
		class Particle {
			x: number
			y: number
			vx: number
			vy: number
			size: number
			energy: number
			hue: number
			saturation: number
			brightness: number
			connections: number[]

			constructor() {
				this.x = rand(0, 1)
				this.y = rand(0, 1)
				this.vx = rand(-0.00005, 0.00005)
				this.vy = rand(-0.00005, 0.00005)
				this.size = BASE_PARTICLE_SIZE
				this.energy = 0
				this.hue = rand(0, 360)
				this.saturation = rand(0.7, 1)
				this.brightness = rand(0.5, 0.9)
				this.connections = []
			}

			update(dT: number, beatEnergy: number = 0) {
				// Apply velocity
				this.x += this.vx * dT
				this.y += this.vy * dT

				// Boundary wrap
				if (this.x > 1) this.x = 0
				if (this.x < 0) this.x = 1
				if (this.y > 1) this.y = 0
				if (this.y < 0) this.y = 1

				// Energy decay
				this.energy = Math.max(0, this.energy * Math.pow(ENERGY_DECAY, dT))

				// Add energy from beat
				if (beatEnergy > 0) {
					this.energy += beatEnergy * rand(0.2, 1)
				}

				// Slowly shift hue
				this.hue = (this.hue + COLOR_SHIFT_RATE * dT) % 360
			}

			draw(ctx: CanvasRenderingContext2D, width: number, height: number) {
				const x = this.x * width
				const y = this.y * height

				// Calculate size based on energy
				const displaySize = (BASE_PARTICLE_SIZE + this.energy * 0.05) * Math.min(width, height)

				// Draw glow
				const gradient = ctx.createRadialGradient(x, y, 0, x, y, displaySize * 2)

				const color = hslToRgb(this.hue, this.saturation, this.brightness)
				gradient.addColorStop(0, color)
				gradient.addColorStop(1, "rgba(0,0,0,0)")

				ctx.fillStyle = gradient
				ctx.beginPath()
				ctx.arc(x, y, displaySize * 2, 0, Math.PI * 2)
				ctx.fill()

				// Draw core
				ctx.fillStyle = "rgba(255, 255, 255, 0.9)"
				ctx.beginPath()
				ctx.arc(x, y, displaySize * 0.5, 0, Math.PI * 2)
				ctx.fill()
			}
		}

		// Constellation manager
		class ConstellationSystem {
			particles: Particle[]
			connections: {from: number; to: number; strength: number}[]
			totalEnergy: number
			keySignature: number
			segmentCounter: number

			constructor() {
				this.particles = Array.from({length: MAX_PARTICLES}, () => new Particle())
				this.connections = []
				this.totalEnergy = 0
				this.keySignature = 0
				this.segmentCounter = 0
			}

			update(dT: number, music: any) {
				let beatEnergy = 0
				let sectionChanged = false

				// Process music data
				if (music) {
					// Handle beat
					if (music.changed.beat && music.beat.current) {
						beatEnergy = music.beat.current.perceivedLoudness || 0
						this.totalEnergy = Math.min(1, this.totalEnergy + beatEnergy * 0.2)
					}

					// Handle section changes
					if (music.changed.section && music.section.current) {
						sectionChanged = true

						// Get dominant key from key confidence array
						if (music.section.current.keys) {
							let maxVal = 0
							let maxIdx = 0
							for (let i = 0; i < music.section.current.keys.length; i++) {
								if (music.section.current.keys[i] > maxVal) {
									maxVal = music.section.current.keys[i]
									maxIdx = i
								}
							}
							this.keySignature = maxIdx
						}

						// Reset connections on key changes
						this.connections = []
					}

					// Handle segment energy
					if (music.changed.segment && music.segment.current) {
						this.segmentCounter++

						// Every few segments, recalculate connections
						if (this.segmentCounter % 5 === 0) {
							this.updateConnections(music.segment.current)
						}

						// Apply energy based on frequency bands
						const lowFactor = music.segment.current.lowEnergy || 0
						const midFactor = music.segment.current.midEnergy || 0
						const highFactor = music.segment.current.highEnergy || 0

						// Apply energy to different particle groups
						const third = Math.floor(this.particles.length / 3)

						// Low frequencies affect bottom third
						for (let i = 0; i < third; i++) {
							this.particles[i].energy = Math.min(1, this.particles[i].energy + lowFactor * 0.2)
						}

						// Mid frequencies affect middle third
						for (let i = third; i < 2 * third; i++) {
							this.particles[i].energy = Math.min(1, this.particles[i].energy + midFactor * 0.2)
						}

						// High frequencies affect top third
						for (let i = 2 * third; i < this.particles.length; i++) {
							this.particles[i].energy = Math.min(1, this.particles[i].energy + highFactor * 0.2)
						}
					}
				}

				// Update all particles
				for (const particle of this.particles) {
					particle.update(dT, beatEnergy)
				}

				// Apply constellation forces
				this.applyConstellationForces(dT)

				// System energy decay
				this.totalEnergy *= Math.pow(ENERGY_DECAY, dT)
			}

			updateConnections(segment: any) {
				this.connections = []

				// Clear existing connections
				for (const p of this.particles) {
					p.connections = []
				}

				// Create new connections based on proximity and energy
				for (let i = 0; i < this.particles.length; i++) {
					for (let j = i + 1; j < this.particles.length; j++) {
						const p1 = this.particles[i]
						const p2 = this.particles[j]

						// Calculate distance
						const dx = Math.abs(p1.x - p2.x)
						const dy = Math.abs(p1.y - p2.y)
						// Handle wrap-around distances
						const wrappedDx = Math.min(dx, 1 - dx)
						const wrappedDy = Math.min(dy, 1 - dy)
						const distance = Math.sqrt(wrappedDx * wrappedDx + wrappedDy * wrappedDy)

						// If close enough and energetic enough
						if (distance < CONSTELLATION_THRESHOLD && (p1.energy > 0.2 || p2.energy > 0.2)) {
							const strength = (1 - distance / CONSTELLATION_THRESHOLD) * Math.min(1, (p1.energy + p2.energy) / 2)

							// Add connection if strong enough
							if (strength > 0.1) {
								this.connections.push({from: i, to: j, strength})
								p1.connections.push(j)
								p2.connections.push(i)
							}
						}
					}
				}
			}

			applyConstellationForces(dT: number) {
				// Apply gentle forces to maintain constellations
				for (const conn of this.connections) {
					const p1 = this.particles[conn.from]
					const p2 = this.particles[conn.to]

					// Calculate vector
					let dx = p2.x - p1.x
					let dy = p2.y - p1.y

					// Handle wrap-around
					if (Math.abs(dx) > 0.5) dx = dx > 0 ? dx - 1 : dx + 1
					if (Math.abs(dy) > 0.5) dy = dy > 0 ? dy - 1 : dy + 1

					// Calculate distance
					const dist = Math.sqrt(dx * dx + dy * dy)
					if (dist === 0) continue

					// Normalize
					const nx = dx / dist
					const ny = dy / dist

					// Target distance based on key signature and energy
					const idealDist = CONSTELLATION_THRESHOLD * 0.6 * (1 + 0.2 * Math.sin((this.keySignature / 24) * Math.PI * 2))

					// Force strength
					const forceMagnitude = (dist - idealDist) * 0.00001 * conn.strength * dT

					// Apply force
					p1.vx += nx * forceMagnitude
					p1.vy += ny * forceMagnitude
					p2.vx -= nx * forceMagnitude
					p2.vy -= ny * forceMagnitude
				}
			}

			draw(ctx: CanvasRenderingContext2D, width: number, height: number) {
				// Draw connections first
				for (const conn of this.connections) {
					const p1 = this.particles[conn.from]
					const p2 = this.particles[conn.to]

					// Skip if either particle has low energy
					if (p1.energy < 0.1 && p2.energy < 0.1) continue

					const x1 = p1.x * width
					const y1 = p1.y * height
					const x2 = p2.x * width
					const y2 = p2.y * height

					// Check if we need to draw across the boundary
					const dx = Math.abs(p1.x - p2.x)
					const dy = Math.abs(p1.y - p2.y)

					// If the direct distance is greater than half the canvas,
					// it means we should draw around the other side
					if (dx > 0.5 || dy > 0.5) continue

					// Set line style based on connection strength and particle energy
					const energy = (p1.energy + p2.energy) / 2
					const alpha = conn.strength * energy * 0.8

					// Blend colors from both particles
					const hue = (p1.hue + p2.hue) / 2
					ctx.strokeStyle = `hsla(${hue}, 80%, 70%, ${alpha})`

					// Line width based on energy
					ctx.lineWidth = 1 + 3 * energy * conn.strength

					// Draw line with glow effect
					ctx.shadowBlur = 10 * energy
					ctx.shadowColor = `hsla(${hue}, 100%, 70%, ${alpha})`

					ctx.beginPath()
					ctx.moveTo(x1, y1)
					ctx.lineTo(x2, y2)
					ctx.stroke()

					// Reset shadow
					ctx.shadowBlur = 0
				}

				// Draw particles on top
				for (const particle of this.particles) {
					particle.draw(ctx, width, height)
				}

				// Draw overall system visual elements based on total energy
				if (this.totalEnergy > 0.3) {
					// Draw central energy core if system has high energy
					const centerX = width / 2
					const centerY = height / 2
					const radius = Math.min(width, height) * 0.1 * this.totalEnergy

					const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)

					// Color based on key signature
					const keyHue = (this.keySignature / 24) * 360
					gradient.addColorStop(0, `hsla(${keyHue}, 100%, 80%, ${this.totalEnergy * 0.5})`)
					gradient.addColorStop(0.7, `hsla(${keyHue}, 80%, 60%, ${this.totalEnergy * 0.2})`)
					gradient.addColorStop(1, "rgba(0,0,0,0)")

					ctx.fillStyle = gradient
					ctx.beginPath()
					ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
					ctx.fill()
				}
			}
		}

		// Create constellation system
		const system = new ConstellationSystem()

		// Main render loop
		return (deltaTime, music) => {
			// Clear canvas with semi-transparent black for trail effect
			ctx.fillStyle = "rgba(0, 0, 0, 0.1)"
			ctx.fillRect(0, 0, canvas.width, canvas.height)

			// Update and draw system
			system.update(deltaTime, music)
			system.draw(ctx, canvas.width, canvas.height)
		}
	},
})
