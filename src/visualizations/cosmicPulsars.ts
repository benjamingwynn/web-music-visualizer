import {MusicCanvas} from "../audio/canvas.ts" // Assuming this path is correct from your project

MusicCanvas.registerVisualization("cosmicPulsars", {
	info: {
		name: "Cosmic Pulsars",
		author: "Gemini 2.5 Pro",
		description: "Glowing orbs that pulse, flare, and drift through space, reacting to the rhythm and energy of the music.",
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

		const NUM_PULSARS = 15
		const BASE_DRIFT_SPEED = 0.000005 // Slow drift speed for pulsars
		const BEAT_IMPULSE_STRENGTH = 0.00015 // How much a beat 'pushes' a pulsar
		const FLARE_DECAY_RATE = 0.95 // How quickly flare size/brightness fades (per frame, adjusted for dT)
		const IMPULSE_DECAY_RATE = 0.97 // How quickly beat-induced velocity fades (per frame, adjusted for dT)
		const BASE_SIZE_MIN = 0.01 // Minimum base size of a pulsar (percentage of canvas min dimension)
		const BASE_SIZE_MAX = 0.03 // Maximum base size
		const BEAT_SIZE_MULTIPLIER = 0.05 // Max additional size based on beat loudness
		const BACKGROUND_ALPHA = 0.1 // Controls the trail effect (lower means longer trails)

		class Pulsar {
			x: number // position (0-1)
			y: number // position (0-1)
			vx: number // base velocity x
			vy: number // base velocity y
			ivx: number // impulse velocity x (from beats)
			ivy: number // impulse velocity y (from beats)
			baseSize: number
			flareSize: number // additional size from beat flare
			hue: number // color hue (0-360)
			saturation: number // color saturation (0-100)
			lightness: number // current lightness (0-100)
			baseLightness: number // base lightness, affected by segments
			flareBrightness: number // additional brightness from beat flare

			constructor() {
				this.x = rand(0, 1)
				this.y = rand(0, 1)
				this.vx = rand(BASE_DRIFT_SPEED / 2, BASE_DRIFT_SPEED) * randSign()
				this.vy = rand(BASE_DRIFT_SPEED / 2, BASE_DRIFT_SPEED) * randSign()
				this.ivx = 0
				this.ivy = 0
				this.baseSize = rand(BASE_SIZE_MIN, BASE_SIZE_MAX)
				this.flareSize = 0
				this.hue = rand(180, 300) // Start with blues, purples, pinks
				this.saturation = rand(70, 100)
				this.baseLightness = rand(40, 60)
				this.lightness = this.baseLightness
				this.flareBrightness = 0
			}

			reactToBeat(loudness: number) {
				// Loudness is typically 0-1
				this.flareSize = loudness * BEAT_SIZE_MULTIPLIER
				this.flareBrightness = 50 * loudness // Flare up brightness

				const angle = rand(0, Math.PI * 2)
				const impulseMagnitude = BEAT_IMPULSE_STRENGTH * (0.5 + loudness * 1.5) // Stronger impulse for louder beats
				this.ivx += Math.cos(angle) * impulseMagnitude
				this.ivy += Math.sin(angle) * impulseMagnitude
			}

			reactToSegment(segmentMidEnergy: number, segmentHighEnergy: number) {
				const energy = (segmentMidEnergy + segmentHighEnergy) / 2 // Average energy
				this.hue = (this.hue + energy * 30 * (16 / 1000)) % 360 // Slow hue shift based on energy, assuming dT influences rate
				this.baseLightness = 40 + energy * 30 // Base lightness reacts to energy
			}

			reactToSectionChange(sectionLoudnessAvg: number, sectionIndex: number) {
				// Create a new color theme for the pulsar based on the section
				this.hue = (sectionIndex * 60 + rand(-20, 20)) % 360 // Shift base hue per section
				this.saturation = 60 + sectionLoudnessAvg * 40 // Saturation based on section loudness
			}

			tick(dT: number) {
				// dT is deltaTime in milliseconds
				this.x += (this.vx + this.ivx) * dT
				this.y += (this.vy + this.ivy) * dT

				// Decay flare and impulse effects over time
				// The Math.pow adjustment makes decay rate behave more consistently if dT varies
				const decayFactor = Math.min(1.0, dT / 16.667) // Normalize dT (assuming ~60fps target)

				this.flareSize *= Math.pow(FLARE_DECAY_RATE, decayFactor)
				this.flareBrightness *= Math.pow(FLARE_DECAY_RATE, decayFactor)
				this.lightness = Math.min(100, this.baseLightness + this.flareBrightness)

				this.ivx *= Math.pow(IMPULSE_DECAY_RATE, decayFactor)
				this.ivy *= Math.pow(IMPULSE_DECAY_RATE, decayFactor)

				// Boundary checks (loop around screen)
				const currentVisualSize = this.baseSize + this.flareSize
				if (this.x > 1 + currentVisualSize) this.x = 0 - currentVisualSize
				else if (this.x < 0 - currentVisualSize) this.x = 1 + currentVisualSize
				if (this.y > 1 + currentVisualSize) this.y = 0 - currentVisualSize
				else if (this.y < 0 - currentVisualSize) this.y = 1 + currentVisualSize
			}

			draw(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
				const actualX = this.x * canvasWidth
				const actualY = this.y * canvasHeight
				const actualSize = (this.baseSize + this.flareSize) * Math.min(canvasWidth, canvasHeight)

				if (actualSize <= 0.1) return // Don't draw if too small

				// Create a radial gradient for a soft, glowing effect
				const grad = ctx.createRadialGradient(actualX, actualY, actualSize * 0.05, actualX, actualY, actualSize)
				// Brighter, more opaque center, fading outwards
				grad.addColorStop(0, `hsla(${this.hue}, ${this.saturation}%, ${Math.min(100, this.lightness + 15)}%, 0.9)`)
				grad.addColorStop(0.4, `hsla(${this.hue}, ${this.saturation}%, ${this.lightness}%, 0.7)`)
				grad.addColorStop(1, `hsla(${this.hue}, ${this.saturation}%, ${this.lightness}%, 0)`)

				ctx.fillStyle = grad
				ctx.beginPath()
				ctx.arc(actualX, actualY, actualSize, 0, Math.PI * 2)
				ctx.fill()
			}
		}

		const pulsars = Array.from({length: NUM_PULSARS}).map(() => new Pulsar())
		let lastProcessedSectionIndex = -1

		return (deltaTime: number, music) => {
			// Fill background with a low alpha for a trail effect
			ctx.fillStyle = `rgba(0, 0, 15, ${BACKGROUND_ALPHA})` // Dark space blue
			ctx.fillRect(0, 0, canvas.width, canvas.height)

			if (music) {
				// Beat reaction
				if (music.changed.beat && music.beat.current) {
					const loudness = music.beat.current.perceivedLoudness
					pulsars.forEach((p) => p.reactToBeat(loudness))
				}

				// Segment reaction (continuous influence)
				if (music.segment.current) {
					const midEnergy = music.segment.current.midEnergy
					const highEnergy = music.segment.current.highEnergy
					pulsars.forEach((p) => p.reactToSegment(midEnergy, highEnergy))
				}

				// Section change reaction
				if (music.changed.section && music.section.current && music.section.current.index !== lastProcessedSectionIndex) {
					lastProcessedSectionIndex = music.section.current.index
					const sectionLoudnessAvg = music.section.current.perceivedLoudness.avg
					pulsars.forEach((p) => p.reactToSectionChange(sectionLoudnessAvg, lastProcessedSectionIndex))
				}
			}

			// Update and draw all pulsars
			pulsars.forEach((p) => {
				p.tick(deltaTime)
				p.draw(ctx, canvas.width, canvas.height)
			})
		}
	},
})
