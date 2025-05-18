import {MusicCanvas} from "../audio/canvas.ts" // Assuming this path is correct for your setup
import type {AudioTrackerContext} from "../audio/tracker.ts"

MusicCanvas.registerVisualization("stellarSynapse", {
	info: {
		name: "Stellar Synapse",
		author: "Gemini AI 2.5 Pro",
		description:
			"A vibrant central star pulsates with the core rhythm of the music, emitting bursts of stardust that dance and shimmer according to the music's energy and texture.",
	},
	does: (canvas) => {
		const ctx = canvas.getContext("2d")
		if (!ctx) throw new Error("Could not create 2D canvas context")

		/** inclusive of min, exclusive of max */
		function rand(min: number, max: number): number {
			return Math.random() * (max - min) + min
		}
		function randSign(): 1 | -1 {
			return Math.random() < 0.5 ? -1 : 1
		}

		const starPulseDecay = 0.9
		const particleOpacityDecay = 0.995
		const maxParticles = 150
		const particles: StardustParticle[] = []

		class Star {
			x = 0.5 // Center of canvas
			y = 0.5 // Center of canvas
			baseRadius = 0.05
			currentRadius = this.baseRadius
			pulseMagnitude = 0
			baseColor = {r: 255, g: 223, b: 100} // Warm yellow
			glowIntensity = 0.5 // Based on section loudness

			update(dT: number, music: AudioTrackerContext | undefined) {
				if (music && music.changed.beat && music.beat.current) {
					// Increase pulse on beat, scaled by perceived loudness
					this.pulseMagnitude = music.beat.current.perceivedLoudness * 0.08
				}

				// Apply decay to pulse
				this.pulseMagnitude *= Math.pow(starPulseDecay, dT / 16) // Decay factor adjusted for typical dT

				this.currentRadius = (this.baseRadius + this.pulseMagnitude) * (1 + this.glowIntensity * 0.5)

				if (music && music.section.current) {
					this.glowIntensity = music.section.current.perceivedLoudness.avg
				}
			}

			draw() {
				const xPx = this.x * canvas.width
				const yPx = this.y * canvas.height
				const radiusPx = this.currentRadius * Math.min(canvas.width, canvas.height)

				// Outer glow
				const grad = ctx.createRadialGradient(xPx, yPx, radiusPx * 0.5, xPx, yPx, radiusPx * 1.5)
				grad.addColorStop(0, `rgba(${this.baseColor.r}, ${this.baseColor.g}, ${this.baseColor.b}, ${0.8 * this.glowIntensity})`)
				grad.addColorStop(0.5, `rgba(${this.baseColor.r}, ${this.baseColor.g}, ${this.baseColor.b}, ${0.3 * this.glowIntensity})`)
				grad.addColorStop(1, `rgba(${this.baseColor.r}, ${this.baseColor.g}, ${this.baseColor.b}, 0)`)
				ctx.fillStyle = grad
				ctx.beginPath()
				ctx.arc(xPx, yPx, radiusPx * 1.8, 0, Math.PI * 2) // Larger arc for glow
				ctx.fill()

				// Inner core
				ctx.fillStyle = `rgb(${this.baseColor.r}, ${this.baseColor.g}, ${this.baseColor.b})`
				ctx.beginPath()
				ctx.arc(xPx, yPx, radiusPx, 0, Math.PI * 2)
				ctx.fill()
			}
		}

		class StardustParticle {
			x: number
			y: number
			vx: number
			vy: number
			size: number
			opacity: number
			maxOpacity: number
			color = {r: 255, g: 180, b: 120} // Light orange, can be varied
			age = 0
			lifespan: number // in milliseconds

			constructor(startX: number, startY: number, initialSpeed: number, music: AudioTrackerContext | undefined) {
				this.x = startX
				this.y = startY
				const angle = rand(0, Math.PI * 2)
				const speedVariance = rand(0.5, 1.5) * initialSpeed
				this.vx = Math.cos(angle) * speedVariance * 0.00005 // Scaled down velocity
				this.vy = Math.sin(angle) * speedVariance * 0.00005 // Scaled down velocity
				this.size = rand(0.002, 0.008)
				this.maxOpacity = rand(0.5, 1.0)
				this.opacity = this.maxOpacity
				this.lifespan = rand(2000, 5000) // 2 to 5 seconds lifespan

				if (music && music.segment.current) {
					// Vary color brightness based on segment energy
					const energyFactor = Math.min(1, music.segment.current.rmsEnergy * 2) // Cap energy factor
					this.color.r = Math.min(255, 180 + Math.floor(energyFactor * 75))
					this.color.g = Math.min(255, 150 + Math.floor(energyFactor * 75))
					this.color.b = Math.min(255, 100 + Math.floor(energyFactor * 50))

					// Higher energy segments might make particles shimmer more initially
					if (music.segment.current.highEnergy > 0.5) {
						this.opacity = Math.min(1, this.opacity + music.segment.current.highEnergy * 0.3)
					}
				}
			}

			update(dT: number, music: AudioTrackerContext | undefined) {
				this.x += this.vx * dT
				this.y += this.vy * dT
				this.age += dT

				this.opacity *= Math.pow(particleOpacityDecay, dT / 16) // Decay factor adjusted

				if (this.opacity < 0.01 || this.age > this.lifespan) {
					this.opacity = 0 // Mark for removal
				}

				// Subtle reaction to tatums for existing particles
				if (music && music.changed.tatum && music.tatum.current) {
					// Briefly increase size or change velocity slightly
					this.size *= 1 + music.tatum.current.confidence * 0.05
					this.vx += rand(-0.00001, 0.00001) * music.tatum.current.confidence
					this.vy += rand(-0.00001, 0.00001) * music.tatum.current.confidence
				}
				this.size = Math.max(0.001, this.size * 0.998) // Gradually shrink back if enlarged
			}

			draw() {
				if (this.opacity <= 0) return

				const xPx = this.x * canvas.width
				const yPx = this.y * canvas.height
				const sizePx = this.size * Math.min(canvas.width, canvas.height)

				ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.opacity})`
				ctx.beginPath()
				ctx.arc(xPx, yPx, sizePx, 0, Math.PI * 2)
				ctx.fill()
			}
		}

		const star = new Star()

		return (deltaTime, music) => {
			ctx.clearRect(0, 0, canvas.width, canvas.height)

			// Update and draw star
			star.update(deltaTime, music)
			star.draw()

			// Emit new particles on beat
			if (music && music.changed.beat && music.beat.current && particles.length < maxParticles) {
				const numParticlesToEmit = Math.floor(music.beat.current.perceivedLoudness * 10 + rand(1, 3))
				const initialSpeed = 0.5 + music.beat.current.perceivedLoudness // Base speed influenced by loudness
				for (let i = 0; i < numParticlesToEmit; i++) {
					if (particles.length < maxParticles) {
						particles.push(new StardustParticle(star.x, star.y, initialSpeed, music))
					}
				}
			}

			// Update and draw particles
			for (let i = particles.length - 1; i >= 0; i--) {
				const p = particles[i]
				p.update(deltaTime, music)
				if (p.opacity <= 0) {
					particles.splice(i, 1) // Remove dead particles
				} else {
					p.draw()
				}
			}

			// Cap particles if too many somehow accumulate (safety net)
			while (particles.length > maxParticles) {
				particles.shift() // Remove oldest particles
			}
		}
	},
})
