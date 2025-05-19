import {MusicCanvas} from "../audio/canvas.ts"

MusicCanvas.registerVisualization("harmonic_bloom", {
	info: {
		name: "Harmonic Bloom",
		author: "Gemini 2.5 Flash", // As requested, I'll use my name
		description: "Dynamic lines reacting to music's perceived loudness, BPM, and key.",
	},
	does: (canvas) => {
		// Get the 2D rendering context for the canvas
		const ctx = canvas.getContext("2d")
		if (!ctx) {
			throw new Error("Could not create 2D canvas context")
		}

		// Function to generate a random number within a range (inclusive min, exclusive max)
		function rand(min, max) {
			return Math.random() * (max - min) + min
		}

		// Function to generate a random sign (1 or -1)
		function randSign() {
			return Math.random() < 0.5 ? -1 : 1
		}

		// --- Configuration ---
		const numberOfLines = 50 // How many lines to draw
		const baseLineThickness = 2 // Base thickness of the lines
		const maxLoudnessThicknessMultiplier = 10 // How much loudness affects thickness
		const baseSpeed = 0.00005 // Base movement speed of lines
		const bpmSpeedMultiplier = 0.000001 // How BPM affects speed
		const colorSaturation = "80%" // Saturation for HSL color
		const colorLightness = "50%" // Lightness for HSL color
		const speedDecay = 0.98 // Decay rate for line speed

		// --- Helper to map key confidence to hue ---
		// This is a simple mapping. More complex mappings could use multiple keys.
		// The keys array has 24 elements (12 major, 12 minor).
		// We'll map the dominant key's index to a hue value (0-360).
		function getKeyColorHue(keys) {
			if (!keys || keys.length !== 24) return 0 // Default to red if no key data

			let maxConfidence = 0
			let dominantKeyIndex = 0
			for (let i = 0; i < 24; i++) {
				if (keys[i] > maxConfidence) {
					maxConfidence = keys[i]
					dominantKeyIndex = i
				}
			}

			// Map the 0-23 index to a 0-360 hue value
			// This is a simple linear mapping, can be adjusted for different color schemes
			return (dominantKeyIndex / 23) * 360
		}

		// --- Line Class ---
		class DynamicLine {
			constructor() {
				// Start and end points (normalized 0-1)
				this.startX = rand(0, 1)
				this.startY = rand(0, 1)
				this.endX = rand(0, 1)
				this.endY = rand(0, 1)

				// Velocity (normalized per millisecond)
				this.vx1 = rand(baseSpeed / 2, baseSpeed) * randSign()
				this.vy1 = rand(baseSpeed / 2, baseSpeed) * randSign()
				this.vx2 = rand(baseSpeed / 2, baseSpeed) * randSign()
				this.vy2 = rand(baseSpeed / 2, baseSpeed) * randSign()

				// Accumulated velocity from music
				this.avx1 = 0
				this.avy1 = 0
				this.avx2 = 0
				this.avy2 = 0

				// Initial properties
				this.thickness = baseLineThickness
				this.color = `hsl(0, ${colorSaturation}, ${colorLightness})` // Default color (red)
			}

			// Update line position and properties based on delta time and music data
			tick(dT, music) {
				// Apply velocity and accumulated velocity
				this.startX += (this.vx1 + this.avx1) * dT
				this.startY += (this.vy1 + this.avy1) * dT
				this.endX += (this.vx2 + this.avx2) * dT
				this.endY += (this.vy2 + this.avy2) * dT

				// Apply decay to accumulated velocity
				this.avx1 *= Math.pow(speedDecay, dT)
				this.avy1 *= Math.pow(speedDecay, dT)
				this.avx2 *= Math.pow(speedDecay, dT)
				this.avy2 *= Math.pow(speedDecay, dT)

				// Wrap around the edges
				if (this.startX > 1) this.startX = 0
				if (this.startX < 0) this.startX = 1
				if (this.startY > 1) this.startY = 0
				if (this.startY < 0) this.startY = 1
				if (this.endX > 1) this.endX = 0
				if (this.endX < 0) this.endX = 1
				if (this.endY > 1) this.endY = 0
				if (this.endY < 0) this.endY = 1

				// Update properties based on music data if available
				if (music && music.section.current) {
					// Influence thickness by perceived loudness
					this.thickness = baseLineThickness + music.section.current.perceivedLoudness.avg * maxLoudnessThicknessMultiplier

					// Influence speed/direction on beat changes
					if (music.changed.beat && music.beat.current) {
						const beatInfluence = music.beat.current.perceivedLoudness * 0.001 // Adjust multiplier as needed
						this.avx1 += rand(beatInfluence / 2, beatInfluence) * randSign()
						this.avy1 += rand(beatInfluence / 2, beatInfluence) * randSign()
						this.avx2 += rand(beatInfluence / 2, beatInfluence) * randSign()
						this.avy2 += rand(beatInfluence / 2, beatInfluence) * randSign()
					}

					// Influence color by key
					const hue = getKeyColorHue(music.section.current.keys)
					this.color = `hsl(${hue}, ${colorSaturation}, ${colorLightness})`
				} else {
					// If music data is not available, reset thickness and color
					this.thickness = baseLineThickness
					this.color = `hsl(0, ${colorSaturation}, ${colorLightness})`
				}

				// Influence speed by BPM (subtle effect)
				if (music && music.section.current && music.section.current.bpm.avg) {
					const bpmInfluence = music.section.current.bpm.avg * bpmSpeedMultiplier
					this.vx1 = (this.vx1 > 0 ? 1 : -1) * (baseSpeed + bpmInfluence)
					this.vy1 = (this.vy1 > 0 ? 1 : -1) * (baseSpeed + bpmInfluence)
					this.vx2 = (this.vx2 > 0 ? 1 : -1) * (baseSpeed + bpmInfluence)
					this.vy2 = (this.vy2 > 0 ? 1 : -1) * (baseSpeed + bpmInfluence)
				} else {
					// Reset to base speed if no BPM data
					this.vx1 = (this.vx1 > 0 ? 1 : -1) * baseSpeed
					this.vy1 = (this.vy1 > 0 ? 1 : -1) * baseSpeed
					this.vx2 = (this.vx2 > 0 ? 1 : -1) * baseSpeed
					this.vy2 = (this.vy2 > 0 ? 1 : -1) * baseSpeed
				}
			}

			// Draw the line on the canvas
			draw(ctx, canvasWidth, canvasHeight) {
				ctx.beginPath()
				ctx.moveTo(this.startX * canvasWidth, this.startY * canvasHeight)
				ctx.lineTo(this.endX * canvasWidth, this.endY * canvasHeight)
				ctx.lineWidth = this.thickness
				ctx.strokeStyle = this.color
				ctx.stroke()
			}
		}

		// Create an array of lines
		const lines = Array.from({length: numberOfLines}).map(() => new DynamicLine())

		// This is the main animation loop function called by MusicCanvas
		return (deltaTime, music) => {
			// Clear the entire canvas
			ctx.clearRect(0, 0, canvas.width, canvas.height)

			// Update and draw each line
			for (const line of lines) {
				line.tick(deltaTime, music)
				line.draw(ctx, canvas.width, canvas.height)
			}
		}
	},
})
