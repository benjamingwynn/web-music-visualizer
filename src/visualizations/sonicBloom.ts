import {MusicCanvas} from "api"

MusicCanvas.registerVisualization("sonic-bloom", {
	info: {
		name: "Sonic Bloom",
		author: "Gemini 2.5 flash",
		description: "An organic visualization where abstract flora blossoms and reacts to the music's rhythm, dynamics, and energy shifts. Watch as vibrant petals unfurl and contract, their size and color dictated by the song's energy spectrum and overall loudness.",
		rating: 3,
	},
	does: (canvas, signal) => {
		const ctx = canvas.getContext("2d")
		if (!ctx) throw new Error("Could not create 2D canvas context")

		// Helper functions
		function rand(min: number, max: number): number {
			return Math.random() * (max - min) + min
		}
		function lerp(a: number, b: number, t: number): number {
			return a + (b - a) * t
		}
		function clamp(value: number, min: number, max: number): number {
			return Math.max(min, Math.min(value, max))
		}

		// Configuration constants for the visualization
		const maxBlooms = 120 // Maximum number of active blooms on screen
		const bloomDecayRate = 0.0008 // How fast blooms shrink/fade over time
		const initialBloomSize = 0.005 // Starting size of a newly spawned bloom
		const maxBloomScale = 0.15 // Maximum bloom size relative to canvas dimension
		const bloomGrowthSpeed = 0.08 // Speed at which blooms expand to their target size
		const bloomSpawnRadius = 0.15 // Blooms spawn within this radius from the center

		// Global HSL color base for the current section, influenced by musical keys
		let sectionColorHue: number = 200 // Default blueish hue (0-360)
		let sectionColorSaturation: number = 80 // Default saturation (0-100)
		let sectionColorLightness: number = 50 // Default lightness (0-100)

		// Function to convert HSL (Hue, Saturation, Lightness) to RGB
		// H: 0-360, S: 0-100, L: 0-100
		function hslToRgb(h: number, s: number, l: number): [number, number, number] {
			s /= 100
			l /= 100
			let c = (1 - Math.abs(2 * l - 1)) * s,
				x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
				m = l - c / 2,
				r = 0,
				g = 0,
				b = 0

			if (0 <= h && h < 60) {
				r = c
				g = x
				b = 0
			} else if (60 <= h && h < 120) {
				r = x
				g = c
				b = 0
			} else if (120 <= h && h < 180) {
				r = 0
				g = c
				b = x
			} else if (180 <= h && h < 240) {
				r = 0
				g = x
				b = c
			} else if (240 <= h && h < 300) {
				r = x
				g = 0
				b = c
			} else if (300 <= h && h < 360) {
				r = c
				g = 0
				b = x
			}
			r = Math.round((r + m) * 255)
			g = Math.round((g + m) * 255)
			b = Math.round((b + m) * 255)

			return [r, g, b]
		}

		// Represents a single "petal" or "tendril" in the bloom
		class Bloom {
			x: number
			y: number
			initialAngle: number
			rotationSpeed: number
			currentAngle: number
			size: number
			targetSize: number
			colorR: number
			colorG: number
			colorB: number
			alpha: number
			life: number
			initialLifeFactor: number // Factor to randomize lifespan

			constructor(centerX: number, centerY: number, initialAngle: number, initialColor: [number, number, number]) {
				this.x = centerX
				this.y = centerY
				this.initialAngle = initialAngle
				this.rotationSpeed = rand(-0.0005, 0.0005)
				this.currentAngle = initialAngle
				this.size = initialBloomSize
				this.targetSize = initialBloomSize
				;[this.colorR, this.colorG, this.colorB] = initialColor
				this.alpha = 0.8
				this.life = 1.0 // Starts with full life
				this.initialLifeFactor = rand(0.8, 1.2) // Randomize life for varied decay
			}

			// Update bloom's state based on time elapsed
			tick(deltaTime: number) {
				this.life -= bloomDecayRate * deltaTime * this.initialLifeFactor
				this.size = lerp(this.size, this.targetSize, bloomGrowthSpeed * deltaTime)
				this.currentAngle += this.rotationSpeed * deltaTime
				this.alpha = Math.max(0, this.life) // Alpha fades with life

				// Gradually shrink target size to prevent indefinite growth
				this.targetSize *= Math.pow(0.999, deltaTime)
				if (this.targetSize < initialBloomSize) this.targetSize = initialBloomSize
			}

			// Draw the bloom on the canvas
			draw(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
				if (this.alpha <= 0.01) return // Don't draw if nearly invisible

				ctx.save()
				ctx.translate(this.x * canvasWidth, this.y * canvasHeight)
				ctx.rotate(this.currentAngle)

				const scaledSize = this.size * Math.min(canvasWidth, canvasHeight)
				ctx.fillStyle = `rgba(${Math.floor(this.colorR)}, ${Math.floor(this.colorG)}, ${Math.floor(this.colorB)}, ${this.alpha})`
				ctx.strokeStyle = `rgba(0, 0, 0, ${this.alpha * 0.3})` // Subtle black stroke
				ctx.lineWidth = 1

				// Draw a simple petal shape with curves for organic feel
				ctx.beginPath()
				ctx.moveTo(0, 0)
				ctx.bezierCurveTo(
					scaledSize * 0.3,
					scaledSize * 0.5,
					scaledSize * 0.7,
					scaledSize * 1.5,
					0,
					scaledSize * 2 // Peak of petal
				)
				ctx.bezierCurveTo(-scaledSize * 0.7, scaledSize * 1.5, -scaledSize * 0.3, scaledSize * 0.5, 0, 0)
				ctx.closePath()
				ctx.fill()

				ctx.restore()
			}
		}

		let blooms: Bloom[] = []

		// Function to determine bloom color based on segment energy and section's base HSL
		function getEnergyTintedColor(low: number, mid: number, high: number): [number, number, number] {
			const hueShiftLow = low * 40
			const hueShiftHigh = high * -40
			let currentHue = (sectionColorHue + hueShiftLow + hueShiftHigh) % 360
			if (currentHue < 0) currentHue += 360

			const energySum = low + mid + high
			const saturationBoost = energySum * 30
			const currentSaturation = clamp(sectionColorSaturation + saturationBoost, 40, 100)

			const lightnessShift = mid * 15 - low * 10 + energySum * 5
			const currentLightness = clamp(sectionColorLightness + lightnessShift, 20, 80)

			return hslToRgb(currentHue, currentSaturation, currentLightness)
		}

		return (deltaTime, music) => {
			// Check if the visualization has been aborted/disposed
			if (signal.aborted) return

			// Create a fading trail effect by drawing a semi-transparent rectangle
			ctx.fillStyle = "rgba(0, 0, 0, 0.08)"
			ctx.fillRect(0, 0, canvas.width, canvas.height)

			if (music) {
				// Respond to musical sections
				if (music.changed.section && music.section.current) {
					blooms = []

					const keys = music.section.current.keys
					let strongestKeyIndex = 0
					let strongestKeyConfidence = 0
					for (let i = 0; i < 12; i++) {
						if (keys[i] > strongestKeyConfidence) {
							strongestKeyConfidence = keys[i]
							strongestKeyIndex = i
						}
					}
					sectionColorHue = (strongestKeyIndex / 12) * 360

					sectionColorSaturation = lerp(50, 90, music.section.current.confidence)
					sectionColorLightness = lerp(40, 70, music.section.current.perceivedLoudness.avg)
				}

				// Respond to individual beats
				if (music.changed.beat && music.beat.current) {
					const beatLoudness = music.beat.current.perceivedLoudness
					const numNewBlooms = Math.ceil(lerp(1, 8, beatLoudness))
					for (let i = 0; i < numNewBlooms; i++) {
						const angle = rand(0, Math.PI * 2)
						const radius = rand(0.01, bloomSpawnRadius)
						const newBloom = new Bloom(0.5 + Math.cos(angle) * radius, 0.5 + Math.sin(angle) * radius, angle + rand(-Math.PI / 8, Math.PI / 8), getEnergyTintedColor(0.5, 0.5, 0.5))
						newBloom.targetSize = initialBloomSize + beatLoudness * maxBloomScale * rand(0.5, 1.2)
						blooms.push(newBloom)
					}
					while (blooms.length > maxBlooms) {
						blooms.shift()
					}
				}

				// Respond to musical segments
				if (music.segment.current) {
					const segment = music.segment.current
					const segmentColor = getEnergyTintedColor(segment.lowEnergy, segment.midEnergy, segment.highEnergy)

					const bloomsToAffect = Math.min(blooms.length, Math.ceil(maxBlooms * 0.2))
					for (let i = 0; i < bloomsToAffect; i++) {
						const bloom = blooms[blooms.length - 1 - i]
						bloom.colorR = lerp(bloom.colorR, segmentColor[0], 0.1 * deltaTime)
						bloom.colorG = lerp(bloom.colorG, segmentColor[1], 0.1 * deltaTime)
						bloom.colorB = lerp(bloom.colorB, segmentColor[2], 0.1 * deltaTime)

						bloom.targetSize = lerp(bloom.targetSize, maxBloomScale * segment.rmsEnergy * rand(0.8, 1.2), 0.1 * deltaTime)
						bloom.rotationSpeed += (segment.zeroCrossingRate - 0.5) * 0.0001
						bloom.rotationSpeed = clamp(bloom.rotationSpeed, -0.002, 0.002)
					}
				}
			}

			// Update and draw all active blooms
			blooms = blooms.filter((b) => b.life > 0.01)
			for (const bloom of blooms) {
				bloom.tick(deltaTime)
				bloom.draw(ctx, canvas.width, canvas.height)
			}
		}
	},
})
