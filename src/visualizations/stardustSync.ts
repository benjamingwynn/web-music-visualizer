import type {Analysis, DetectedBeat, DetectedSection, DetectedSegment, PositionEstimate} from "musiq"
import {MusicCanvas, type AudioTrackerContext} from "../audio/canvas.ts" // Assuming types are available like this

MusicCanvas.registerVisualization("stardustsync", {
	info: {
		name: "Stardust Sync",
		author: "Gemini 2.5 pro",
		description: "A celestial dance of particles, pulsing and flaring in time with the music's rhythm and energy, creating a dynamic stardust nebula.",
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

		const numStars = 150
		// Decay factors per millisecond. An effect lasting ~300ms would need (decay)^300 = 0.1, so decay = 0.1^(1/300) ~ 0.992
		const tatumPulseDecayPerMs = 0.992 // For tatumPulse
		const beatFlareDecayPerMs = 0.985 // For beatFlare, slightly faster decay for bigger effect

		let globalGlow = 0.1 // Initial background glow intensity

		class Star {
			x: number
			y: number
			baseRadius: number
			currentRadius: number

			baseHue: number
			currentHue: number
			baseSaturation: number
			currentSaturation: number
			baseLightness: number
			currentLightness: number

			baseOpacity: number
			currentOpacity: number

			tatumPulse: number // Increases on tatum, affects radius & lightness
			beatFlare: number // Increases on beat, affects radius, lightness, hue

			twinklePhase: number
			twinkleSpeed: number // Radians per millisecond for consistency regardless of frame rate

			constructor() {
				this.x = rand(0, 1)
				this.y = rand(0, 1)
				this.baseRadius = rand(0.0005, 0.0035) // Relative to min(canvas.width, canvas.height)
				this.currentRadius = this.baseRadius

				this.baseHue = rand(180, 290) // Blues, purples, cool magentas
				this.currentHue = this.baseHue
				this.baseSaturation = rand(60, 100)
				this.currentSaturation = this.baseSaturation
				this.baseLightness = rand(40, 70)
				this.currentLightness = this.baseLightness

				this.baseOpacity = rand(0.2, 0.7)
				this.currentOpacity = this.baseOpacity

				this.tatumPulse = 0
				this.beatFlare = 0

				this.twinklePhase = rand(0, Math.PI * 2)
				this.twinkleSpeed = rand(0.0005, 0.0015) // Slower speed for ms
			}

			tick(dT_ms: number) {
				// Decay reaction intensities based on dT_ms
				this.tatumPulse *= Math.pow(tatumPulseDecayPerMs, dT_ms)
				this.beatFlare *= Math.pow(beatFlareDecayPerMs, dT_ms)

				// Apply reactions
				this.currentRadius = this.baseRadius * (1 + this.tatumPulse * 0.7 + this.beatFlare * 2.2)
				const lightnessBoost = this.tatumPulse * 15 + this.beatFlare * 35

				// Subtle independent twinkle for lightness
				this.twinklePhase += this.twinkleSpeed * dT_ms
				const twinkleEffect = (Math.sin(this.twinklePhase) * 0.5 + 0.5) * 10 // 0 to 10 lightness units

				this.currentLightness = Math.min(95, this.baseLightness + lightnessBoost + twinkleEffect)
				this.currentOpacity = Math.min(1, this.baseOpacity + this.tatumPulse * 0.2 + this.beatFlare * 0.4 + twinkleEffect / 200)

				// Reset hue/saturation if flare effect has mostly faded
				if (this.beatFlare < 0.05) {
					this.currentHue = this.baseHue
					this.currentSaturation = this.baseSaturation
				}
			}

			reactToTatum(tatum: PositionEstimate) {
				this.tatumPulse = Math.min(1, this.tatumPulse + tatum.confidence * 0.4 + 0.1)
			}

			reactToBeat(beat: DetectedBeat) {
				const beatImpact = beat.perceivedLoudness * 1.0 + 0.1
				this.beatFlare = Math.min(1.5, this.beatFlare * 0.5 + beatImpact) // Mix with existing flare
				this.tatumPulse = Math.min(1, this.tatumPulse + beat.perceivedLoudness * 0.3)

				if (beat.perceivedLoudness > 0.4) {
					// Stronger beats cause hue shift
					this.currentHue = (this.baseHue + randSign() * rand(15, 50) + 360) % 360
					this.currentSaturation = Math.min(100, this.baseSaturation + rand(10, 30))
				}
			}

			draw(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
				const displayRadius = Math.max(0.5, this.currentRadius * Math.min(canvasWidth, canvasHeight))
				const finalOpacity = Math.max(0, Math.min(1, this.currentOpacity))

				// optimization: don't draw if too small or too transparent
				if (displayRadius < 0.5 || finalOpacity < 0.01) return

				ctx.beginPath()
				ctx.arc(this.x * canvasWidth, this.y * canvasHeight, displayRadius, 0, Math.PI * 2)
				ctx.fillStyle = `hsla(${this.currentHue}, ${this.currentSaturation}%, ${this.currentLightness}%, ${finalOpacity})`
				ctx.fill()
			}
		}

		const stars = Array.from({length: numStars}).map(() => new Star())

		return (deltaTime_ms: number, music: AudioTrackerContext | undefined) => {
			ctx.clearRect(0, 0, canvas.width, canvas.height)

			// Update global effects from music
			if (music?.section?.current) {
				globalGlow = music.section.current.perceivedLoudness.avg * 0.5 + 0.05 // Adjusted for more visible glow
			}

			// Draw background nebula glow
			const centerX = canvas.width / 2
			const centerY = canvas.height / 2
			const maxGradientRadius = Math.max(centerX, centerY) * 1.2

			const bgGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxGradientRadius)
			const baseBgLightness = 5
			const glowLightness = Math.min(30, baseBgLightness + globalGlow * 30) // Center is brighter

			bgGradient.addColorStop(0, `hsla(230, 60%, ${glowLightness}%, 0.8)`) // Center of the glow
			bgGradient.addColorStop(0.3, `hsla(240, 50%, ${baseBgLightness + globalGlow * 15}%, 0.7)`) // Mid glow
			bgGradient.addColorStop(1, `hsla(250, 40%, ${baseBgLightness}%, 1)`) // Dark outer space
			ctx.fillStyle = bgGradient
			ctx.fillRect(0, 0, canvas.width, canvas.height)

			// Process music reactions for stars
			if (music) {
				if (music.changed.tatum && music.tatum.current) {
					stars.forEach((star) => {
						if (Math.random() < 0.25) {
							// 25% of stars react to each tatum event
							star.reactToTatum(music.tatum.current!)
						}
					})
				}
				if (music.changed.beat && music.beat.current) {
					stars.forEach((star) => {
						if (Math.random() < 0.5) {
							// 50% of stars react to each beat event
							star.reactToBeat(music.beat.current!)
						}
					})
				}
			}

			// Tick and draw stars
			stars.forEach((star) => {
				star.tick(deltaTime_ms)
				star.draw(ctx, canvas.width, canvas.height)
			})
		}
	},
})
