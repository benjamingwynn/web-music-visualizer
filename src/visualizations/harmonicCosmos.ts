import {MusicCanvas} from "../audio/canvas.ts"

MusicCanvas.registerVisualization("harmonic_cosmos", {
	info: {
		name: "Harmonic Cosmos",
		author: "Claude 3.7 Sonnet",
		description:
			"A cosmic visualization that creates a living universe of particles that respond organically to music. Stars form constellations that pulse with the rhythm while cosmic dust reacts to different frequencies.",
	},
	does: (canvas) => {
		const ctx = canvas.getContext("2d")
		if (!ctx) throw new Error("Could not create 2D canvas context")

		// Color palettes
		const PALETTES = {
			cosmic: ["#003366", "#0066CC", "#66CCFF", "#FFFFFF", "#FF00FF", "#9900CC"],
			warm: ["#FF3300", "#FF9900", "#FFCC00", "#FFFF00", "#FFFFFF", "#FF00FF"],
			cool: ["#006633", "#00CC66", "#00FFCC", "#66FFFF", "#FFFFFF", "#9966FF"],
		}

		// Utility functions
		const rand = (min, max) => Math.random() * (max - min) + min
		const randInt = (min, max) => Math.floor(rand(min, max))
		const randItem = (arr) => arr[randInt(0, arr.length)]
		const randSign = () => (Math.random() < 0.5 ? -1 : 1)

		// Setup constants
		const NUM_STARS = 100
		const NUM_DUST = 300

		let currentPalette = PALETTES.cosmic
		let rotationSpeed = 0.0001
		let globalIntensity = 0
		let lastBeatTime = 0

		// Star class - larger particles that form constellations
		class Star {
			constructor() {
				this.reset()
				// Place randomly throughout the space initially
				this.angle = rand(0, Math.PI * 2)
				this.distance = rand(0.1, 0.4)
			}

			reset() {
				this.angle = rand(0, Math.PI * 2)
				this.distance = rand(0.1, 0.4)
				this.size = rand(0.01, 0.02)
				this.baseSize = this.size
				this.color = randItem(currentPalette)
				this.rotSpeed = rand(0.00005, 0.0002) * randSign()
				this.pulseSpeed = rand(0.001, 0.005)
				this.pulseAmount = 0
				this.connections = []
			}

			updateConnections(stars) {
				this.connections = []
				for (const other of stars) {
					if (other === this) continue

					const dx = this.x - other.x
					const dy = this.y - other.y
					const dist = Math.sqrt(dx * dx + dy * dy)

					if (dist < 0.2) {
						this.connections.push({
							star: other,
							distance: dist,
						})
					}
				}
			}

			get x() {
				return 0.5 + Math.cos(this.angle) * this.distance
			}

			get y() {
				return 0.5 + Math.sin(this.angle) * this.distance
			}

			tick(dT, beatIntensity = 0, sectionEnergy = {low: 0, mid: 0, high: 0}) {
				// Rotate around the center
				this.angle += this.rotSpeed * dT * (1 + globalIntensity * 3)

				// Pulse with the beat
				this.pulseAmount = Math.max(0, this.pulseAmount - dT * 2)
				this.size = this.baseSize * (1 + this.pulseAmount)

				// Affect star properties based on audio
				if (beatIntensity > 0) {
					this.pulseAmount = beatIntensity * 2
				}

				// Adjust rotation and size based on frequency response
				this.rotSpeed += sectionEnergy.mid * 0.000001 * randSign()
				this.baseSize = Math.max(0.005, Math.min(0.03, this.baseSize + sectionEnergy.high * 0.0001 * randSign()))
			}

			draw(ctx, width, height) {
				const x = this.x * width
				const y = this.y * height
				const displaySize = this.size * Math.min(width, height)

				// Draw connections first
				ctx.globalAlpha = 0.3 + globalIntensity * 0.5
				ctx.strokeStyle = this.color
				ctx.lineWidth = 1 + globalIntensity * 3

				for (const connection of this.connections) {
					const other = connection.star
					const opacity = (0.2 - connection.distance) * 5 * (0.5 + globalIntensity)
					if (opacity <= 0) continue

					ctx.globalAlpha = Math.min(1, opacity)
					ctx.beginPath()
					ctx.moveTo(x, y)
					ctx.lineTo(other.x * width, other.y * height)
					ctx.stroke()
				}

				// Draw the star
				ctx.globalAlpha = 0.7 + globalIntensity * 0.3
				ctx.fillStyle = this.color
				ctx.beginPath()
				ctx.arc(x, y, displaySize, 0, Math.PI * 2)
				ctx.fill()

				// Draw glow
				const gradient = ctx.createRadialGradient(x, y, displaySize * 0.5, x, y, displaySize * 4)
				gradient.addColorStop(0, this.color)
				gradient.addColorStop(1, "transparent")

				ctx.globalAlpha = 0.15 + this.pulseAmount * 0.2
				ctx.fillStyle = gradient
				ctx.beginPath()
				ctx.arc(x, y, displaySize * 4, 0, Math.PI * 2)
				ctx.fill()

				ctx.globalAlpha = 1.0
			}
		}

		// Dust class - smaller particles that react to different frequencies
		class Dust {
			constructor() {
				this.reset()
			}

			reset() {
				this.x = rand(0, 1)
				this.y = rand(0, 1)
				this.z = rand(0.1, 1)
				this.baseSize = rand(0.001, 0.005)
				this.size = this.baseSize
				this.color = randItem(currentPalette)
				this.vx = (rand(0.00001, 0.0001) * randSign()) / this.z
				this.vy = (rand(0.00001, 0.0001) * randSign()) / this.z
				this.vz = 0
				this.ax = 0
				this.ay = 0
				this.az = 0
			}

			tick(dT, beatIntensity = 0, sectionEnergy = {low: 0, mid: 0, high: 0}) {
				// Apply acceleration
				this.vx += this.ax * dT
				this.vy += this.ay * dT
				this.vz += this.az * dT

				// Apply velocity
				this.x += this.vx * dT
				this.y += this.vy * dT
				this.z += this.vz * dT

				// Reset acceleration
				this.ax = 0
				this.ay = 0
				this.az = 0

				// Apply damping
				this.vx *= 0.99
				this.vy *= 0.99
				this.vz *= 0.99

				// Loop around edges
				if (this.x > 1 + this.size) {
					this.x = 0 - this.size
				} else if (this.x < 0 - this.size) {
					this.x = 1 + this.size
				}

				if (this.y > 1 + this.size) {
					this.y = 0 - this.size
				} else if (this.y < 0 - this.size) {
					this.y = 1 + this.size
				}

				// Keep z in bounds and handle "respawn"
				if (this.z < 0.1) {
					this.z = 0.1
					this.vz = Math.abs(this.vz) * 0.5
				} else if (this.z > 1) {
					this.z = 1
					this.vz = -Math.abs(this.vz) * 0.5
				}

				// Apply audio forces
				if (beatIntensity > 0) {
					// Push particles away from center on beats
					const dx = this.x - 0.5
					const dy = this.y - 0.5
					const dist = Math.sqrt(dx * dx + dy * dy)

					if (dist > 0) {
						const force = (beatIntensity * 0.001) / dist
						this.ax += (dx / dist) * force
						this.ay += (dy / dist) * force
					}
				}

				// Apply frequency-specific forces
				this.ax += sectionEnergy.low * 0.00005 * randSign()
				this.ay += sectionEnergy.mid * 0.00005 * randSign()
				this.vz += sectionEnergy.high * 0.0001 * randSign()

				// Size based on z (perspective)
				this.size = this.baseSize / this.z
			}

			draw(ctx, width, height) {
				const x = this.x * width
				const y = this.y * height
				const displaySize = this.size * Math.min(width, height)

				ctx.globalAlpha = 0.3 + (1 - this.z) * 0.7
				ctx.fillStyle = this.color
				ctx.beginPath()
				ctx.arc(x, y, displaySize, 0, Math.PI * 2)
				ctx.fill()
			}
		}

		// Create stars and dust
		const stars = Array.from({length: NUM_STARS}).map(() => new Star())
		const dust = Array.from({length: NUM_DUST}).map(() => new Dust())

		// Create connections between stars initially
		for (const star of stars) {
			star.updateConnections(stars)
		}

		// Track time for animation
		let time = 0
		let lastSectionChange = 0

		return (deltaTime, music) => {
			time += deltaTime
			ctx.clearRect(0, 0, canvas.width, canvas.height)

			// Draw background gradient
			const bgGradient = ctx.createRadialGradient(canvas.width * 0.5, canvas.height * 0.5, 0, canvas.width * 0.5, canvas.height * 0.5, canvas.width * 0.7)

			bgGradient.addColorStop(0, "#000011")
			bgGradient.addColorStop(1, "#000000")

			ctx.fillStyle = bgGradient
			ctx.fillRect(0, 0, canvas.width, canvas.height)

			// Process audio data if available
			let beatIntensity = 0
			let sectionEnergy = {low: 0, mid: 0, high: 0}

			if (music) {
				// Handle beat detection
				if (music.changed.beat && music.beat.current) {
					const beat = music.beat.current
					const now = performance.now()
					const timeSinceLastBeat = now - lastBeatTime
					lastBeatTime = now

					beatIntensity = beat.perceivedLoudness

					// Adjust global rotation based on BPM
					rotationSpeed = 0.0001 + (beat.bpm / 200) * 0.0002
				}

				// Handle section changes
				if (music.changed.section && music.section.current) {
					const section = music.section.current
					lastSectionChange = time

					// Change color palette based on key detection
					const keyArray = Array.from(section.keys || [])
					const keySum = keyArray.reduce((sum, val) => sum + val, 0)

					// Choose palette based on key characteristics
					if (keySum > 0) {
						const minorKeys = keyArray.slice(12, 24)
						const majorKeys = keyArray.slice(0, 12)

						const minorSum = minorKeys.reduce((sum, val) => sum + val, 0)
						const majorSum = majorKeys.reduce((sum, val) => sum + val, 0)

						if (minorSum > majorSum * 1.2) {
							currentPalette = PALETTES.cool
						} else if (majorSum > minorSum * 1.2) {
							currentPalette = PALETTES.warm
						} else {
							currentPalette = PALETTES.cosmic
						}

						// Occasionally update star colors on section change
						if (Math.random() < 0.3) {
							for (const star of stars) {
								star.color = randItem(currentPalette)
							}
						}
					}

					// Update connections between stars
					for (const star of stars) {
						star.updateConnections(stars)
					}
				}

				// Process current segment for energy values
				if (music.segment.current) {
					const segment = music.segment.current
					sectionEnergy.low = segment.lowEnergy
					sectionEnergy.mid = segment.midEnergy
					sectionEnergy.high = segment.highEnergy

					// Calculate global intensity based on energy
					const energySum = segment.lowEnergy + segment.midEnergy + segment.highEnergy
					globalIntensity = Math.min(1, energySum / 1.5)
				}
			}

			// Update and draw dust (background layer)
			for (const particle of dust) {
				particle.tick(deltaTime, beatIntensity, sectionEnergy)
				particle.draw(ctx, canvas.width, canvas.height)
			}

			// Update and draw stars (foreground layer)
			for (const star of stars) {
				star.tick(deltaTime, beatIntensity, sectionEnergy)
				star.draw(ctx, canvas.width, canvas.height)
			}

			// Draw title during first few seconds or when section changes
			const titleTimeSeconds = 5
			const sectionFadeSeconds = 3

			if (time < titleTimeSeconds || time - lastSectionChange < sectionFadeSeconds) {
				let alpha = 0

				if (time < titleTimeSeconds) {
					alpha = Math.min(1, time) * (1 - time / titleTimeSeconds)
				} else {
					alpha = Math.max(0, 1 - (time - lastSectionChange) / sectionFadeSeconds) * 0.7
				}

				ctx.globalAlpha = alpha
				ctx.fillStyle = "#FFFFFF"
				ctx.font = "20px Arial"
				ctx.textAlign = "center"
				ctx.textBaseline = "middle"
				ctx.fillText("Harmonic Cosmos", canvas.width / 2, canvas.height * 0.1)
				ctx.font = "14px Arial"
				ctx.fillText("Visualization by Claude", canvas.width / 2, canvas.height * 0.1 + 24)
				ctx.globalAlpha = 1.0
			}
		}
	},
})
