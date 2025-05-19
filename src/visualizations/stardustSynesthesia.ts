import {MusicCanvas, type AudioTrackerContext} from "../audio/canvas.ts" // Assuming types are from a shared module

MusicCanvas.registerVisualization("stardustSynesthesia", {
	info: {
		name: "Stardust Synesthesia",
		author: "Gemini 2.5 pro",
		description:
			"A cosmic dance of stardust, where particles ignite and swirl in response to the music's rhythm, harmony, and energy. Watch as nebulae form and evolve with each beat, section, and frequency shift, creating a unique visual symphony for every song.",
	},
	does: (canvas) => {
		const ctx = canvas.getContext("2d")
		if (!ctx) throw new Error("Could not create 2D canvas context") /**  inclusive of min, exclusive of max */

		function rand(min: number, max: number): number {
			return Math.random() * (max - min) + min
		}

		function hslToRgb(h: number, s: number, l: number): [number, number, number] {
			let r, g, b
			if (s === 0) {
				r = g = b = l // achromatic
			} else {
				const hue2rgb = (p: number, q: number, t: number) => {
					if (t < 0) t += 1
					if (t > 1) t -= 1
					if (t < 1 / 6) return p + (q - p) * 6 * t
					if (t < 1 / 2) return q
					if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
					return p
				}
				const q = l < 0.5 ? l * (1 + s) : l + s - l * s
				const p = 2 * l - q
				r = hue2rgb(p, q, h + 1 / 3)
				g = hue2rgb(p, q, h)
				b = hue2rgb(p, q, h - 1 / 3)
			}
			return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
		}

		const MAX_PARTICLES = 600
		const PARTICLE_LIFESPAN_SECONDS = 4.5
		const PARTICLE_BASE_SIZE = 1.5 // pixels
		const PARTICLE_VELOCITY_DAMPING = 0.98 // per frame/tick if dT is small, or use Math.pow(0.8, dT) if dT is seconds
		const CENTER_PULL_STRENGTH = 0.0003 // gentle pull towards center (in 0-1 coordinate space)

		const BEAT_PARTICLE_COUNT_SCALER = 15
		const BEAT_PULSE_INTENSITY_NEW = 1.8 // For newly created particles
		const BEAT_PULSE_INTENSITY_EXISTING = 0.7 // For existing particles
		const BEAT_PULSE_SIZE_MULTIPLIER = 2.0
		const PULSE_DECAY_RATE = 0.05 // exponential decay rate, e.g., Math.exp(-PULSE_DECAY_RATE * dT_normally_around_16_to_30) or Math.pow(0.1, dT_in_seconds)

		const TATUM_SPARKLE_CHANCE = 0.08
		const TATUM_SPARKLE_DURATION_SECONDS = 0.15

		let particles: Particle[] = []
		let currentBgColor = {r: 5, g: 5, b: 15} // Start with a dark blue
		let targetBgColor = {r: 5, g: 5, b: 15}

		class Particle {
			x: number
			y: number // Position (0-1)
			vx: number
			vy: number // Velocity (units per second, in 0-1 space)
			baseSize: number // Base size in pixels
			currentSize: number // Current size in pixels, affected by pulses
			color: {r: number; g: number; b: number; a: number}
			life: number // Remaining life in seconds
			initialLife: number
			sparkleTimer: number = 0 // For tatum sparkles, in seconds
			pulseIntensity: number = 0 // For beat pulses

			constructor(x: number, y: number, vx: number, vy: number, size: number, color: {r: number; g: number; b: number}, life: number) {
				this.x = x
				this.y = y
				this.vx = vx
				this.vy = vy
				this.baseSize = size
				this.currentSize = size
				this.color = {...color, a: 0} // Start transparent, fade in
				this.initialLife = life
				this.life = life
			}

			update(dT: number, music: AudioTrackerContext | undefined) {
				// dT is deltaTime in seconds
				this.x += this.vx * dT
				this.y += this.vy * dT // Gentle attraction to center

				const dx = 0.5 - this.x
				const dy = 0.5 - this.y
				const distToCenterSq = dx * dx + dy * dy
				if (distToCenterSq > 0.0001) {
					// Avoid extreme pull near center
					const distToCenter = Math.sqrt(distToCenterSq)
					this.vx += (dx / distToCenter) * CENTER_PULL_STRENGTH * (1 + (music?.segment?.current?.lowEnergy || 0)) * dT * 100 // Bass can pull harder
					this.vy += (dy / distToCenter) * CENTER_PULL_STRENGTH * (1 + (music?.segment?.current?.lowEnergy || 0)) * dT * 100
				}

				this.vx *= Math.pow(PARTICLE_VELOCITY_DAMPING, dT * 60) // Normalize damping to assumed 60fps baseline
				this.vy *= Math.pow(PARTICLE_VELOCITY_DAMPING, dT * 60)

				this.life -= dT

				// Fade in/out logic
				const fadeInDuration = this.initialLife * 0.2
				const fadeOutDuration = this.initialLife * 0.3
				if (this.life > this.initialLife - fadeInDuration) {
					// Fading in
					this.color.a = (this.initialLife - this.life) / fadeInDuration
				} else if (this.life < fadeOutDuration) {
					// Fading out
					this.color.a = this.life / fadeOutDuration
				} else {
					// Fully visible
					this.color.a = 1.0
				}
				this.color.a = Math.max(0, Math.min(1, this.color.a))

				// Beat pulse effect
				if (this.pulseIntensity > 0) {
					this.currentSize = this.baseSize * (1 + this.pulseIntensity * BEAT_PULSE_SIZE_MULTIPLIER)
					this.pulseIntensity *= Math.pow(PULSE_DECAY_RATE, dT) // Assumes PULSE_DECAY_RATE is for decay over 1s
					if (this.pulseIntensity < 0.01) this.pulseIntensity = 0
				} else {
					this.currentSize = this.baseSize
				} // Screen wrap

				const margin = (this.currentSize / Math.min(canvas.width, canvas.height)) * 2 // margin based on particle size
				if (this.x > 1 + margin) this.x = -margin
				else if (this.x < -margin) this.x = 1 + margin
				if (this.y > 1 + margin) this.y = -margin
				else if (this.y < -margin) this.y = 1 + margin

				if (this.sparkleTimer > 0) this.sparkleTimer -= dT
			}

			triggerPulse(intensity: number) {
				this.pulseIntensity = Math.max(this.pulseIntensity, intensity)
			}
		}

		return (deltaTimeSeconds: number, music: AudioTrackerContext | undefined) => {
			ctx.globalCompositeOperation = "source-over"
			currentBgColor.r += (targetBgColor.r - currentBgColor.r) * 0.02 // Slower transition for background
			currentBgColor.g += (targetBgColor.g - currentBgColor.g) * 0.02
			currentBgColor.b += (targetBgColor.b - currentBgColor.b) * 0.02
			ctx.fillStyle = `rgb(${Math.round(currentBgColor.r)}, ${Math.round(currentBgColor.g)}, ${Math.round(currentBgColor.b)})`
			ctx.fillRect(0, 0, canvas.width, canvas.height)

			ctx.globalCompositeOperation = "lighter" // Additive blending for stardust

			if (music) {
				if (music.changed.section && music.section.current) {
					const section = music.section.current
					let maxConfidence = -1,
						dominantKeyIndex = 0
					section.keys.forEach((conf, i) => {
						if (conf > maxConfidence) {
							maxConfidence = conf
							dominantKeyIndex = i
						}
					})
					const hue = (dominantKeyIndex % 12) / 12
					const saturation = 0.5 + section.confidence * 0.3
					const lightness = 0.05 + Math.min(section.perceivedLoudness.avg * 0.15, 0.1)
					const [r, g, b] = hslToRgb(hue, saturation, lightness)
					targetBgColor = {r, g, b}
				}

				if (music.changed.beat && music.beat.current) {
					const beat = music.beat.current
					const numNewParticles = Math.floor(beat.perceivedLoudness * BEAT_PARTICLE_COUNT_SCALER * (0.5 + Math.random() * 0.5))

					for (let i = 0; i < numNewParticles && particles.length < MAX_PARTICLES; i++) {
						const angle = rand(0, Math.PI * 2)
						const distFromCenter = rand(0, 0.15) // Spawn in a small radius
						const startX = 0.5 + Math.cos(angle) * distFromCenter
						const startY = 0.5 + Math.sin(angle) * distFromCenter
						const speedMultiplier = 0.05 + beat.perceivedLoudness * 0.15 // units per second
						const vx = Math.cos(angle) * speedMultiplier * rand(0.5, 1.5)
						const vy = Math.sin(angle) * speedMultiplier * rand(0.5, 1.5)
						const pSize = PARTICLE_BASE_SIZE * (1 + rand(0, beat.perceivedLoudness * 0.8))

						let pColor = {r: 200, g: 200, b: 255} // Default: bright stardust
						if (music.segment.current) {
							const seg = music.segment.current
							pColor.r = Math.max(0, Math.min(255, 120 + seg.highEnergy * 135 + seg.midEnergy * 60))
							pColor.g = Math.max(0, Math.min(255, 120 + seg.midEnergy * 135 + seg.lowEnergy * 60))
							pColor.b = Math.max(0, Math.min(255, 120 + seg.lowEnergy * 135 + seg.highEnergy * 30 + (1 - seg.rmsEnergy) * 50)) // More blue if quiet
						}
						const newParticle = new Particle(startX, startY, vx, vy, pSize, pColor, PARTICLE_LIFESPAN_SECONDS * rand(0.7, 1.3))
						newParticle.triggerPulse(BEAT_PULSE_INTENSITY_NEW * beat.perceivedLoudness)
						particles.push(newParticle)
					}
					// Pulse existing particles
					particles.forEach((p) => p.triggerPulse(BEAT_PULSE_INTENSITY_EXISTING * beat.perceivedLoudness * 0.5))
				}

				if (music.changed.tatum && music.tatum.current) {
					particles.forEach((p) => {
						if (Math.random() < TATUM_SPARKLE_CHANCE * (music.tatum.current?.confidence || 0.5)) {
							p.sparkleTimer = TATUM_SPARKLE_DURATION_SECONDS
						}
					})
				}

				// Continuously modulate particle colors slightly by segment energy
				if (music.segment.current) {
					const seg = music.segment.current
					particles.forEach((p) => {
						const targetR = 120 + seg.highEnergy * 135 + seg.midEnergy * 60
						const targetG = 120 + seg.midEnergy * 135 + seg.lowEnergy * 60
						const targetB = 120 + seg.lowEnergy * 135 + seg.highEnergy * 30 + (1 - seg.rmsEnergy) * 50
						p.color.r += (targetR - p.color.r) * 0.05
						p.color.g += (targetG - p.color.g) * 0.05
						p.color.b += (targetB - p.color.b) * 0.05
					})
				}
			}

			for (let i = particles.length - 1; i >= 0; i--) {
				const p = particles[i]
				p.update(deltaTimeSeconds, music)

				if (p.life <= 0) {
					particles.splice(i, 1)
					continue
				}

				let r = p.color.r,
					g = p.color.g,
					b = p.color.b
				let displaySize = p.currentSize

				if (p.sparkleTimer > 0) {
					const sparkleProgress = 1 - p.sparkleTimer / TATUM_SPARKLE_DURATION_SECONDS // 0 to 1
					const sparkleFactor = 1 + Math.sin(sparkleProgress * Math.PI) * 1.2 // Bright peak
					displaySize *= sparkleFactor
					r = Math.min(255, p.color.r + 80 * sparkleFactor)
					g = Math.min(255, p.color.g + 80 * sparkleFactor)
					b = Math.min(255, p.color.b + 80 * sparkleFactor)
				}

				// Ensure color values are integers
				r = Math.round(r)
				g = Math.round(g)
				b = Math.round(b)

				ctx.fillStyle = `rgba(${r},${g},${b},${p.color.a.toFixed(3)})`
				ctx.beginPath()
				ctx.arc(p.x * canvas.width, p.y * canvas.height, displaySize, 0, Math.PI * 2)
				ctx.fill()
			}

			// Ambient particle generation
			if (particles.length < MAX_PARTICLES * 0.2 && Math.random() < 0.05 && music?.segment?.current) {
				// Only if music is playing
				const angle = rand(0, Math.PI * 2)
				const speed = rand(0.005, 0.015) // Slower ambient particles
				const startX = rand(0.1, 0.9) // Spawn anywhere
				const startY = rand(0.1, 0.9)
				const vx = Math.cos(angle) * speed
				const vy = Math.sin(angle) * speed
				const baseParticleSize = PARTICLE_BASE_SIZE * rand(0.4, 0.8)
				const seg = music.segment.current
				let pColor = {r: 80 + seg.highEnergy * 50, g: 80 + seg.midEnergy * 50, b: 80 + seg.lowEnergy * 70}

				particles.push(
					new Particle(
						startX,
						startY,
						vx,
						vy,
						baseParticleSize,
						pColor,
						PARTICLE_LIFESPAN_SECONDS * rand(1.5, 2.5) // Longer life for ambient
					)
				)
			}
		}
	},
})
