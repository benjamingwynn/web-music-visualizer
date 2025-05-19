import {MusicCanvas} from "../audio/canvas.ts"

MusicCanvas.registerVisualization("auroraWaves", {
	info: {
		name: "Aurora Waves",
		author: "Claude 3.7 Sonnet",
		description: "An ethereal aurora borealis-inspired visualization that reacts organically to music",
	},
	does: (canvas) => {
		const ctx = canvas.getContext("2d")
		if (!ctx) throw new Error("Could not create 2D canvas context")

		// Helper functions
		function rand(min: number, max: number): number {
			return Math.random() * (max - min) + min
		}

		function lerpColor(color1: string, color2: string, factor: number): string {
			const r1 = parseInt(color1.substring(1, 3), 16)
			const g1 = parseInt(color1.substring(3, 5), 16)
			const b1 = parseInt(color1.substring(5, 7), 16)

			const r2 = parseInt(color2.substring(1, 3), 16)
			const g2 = parseInt(color2.substring(3, 5), 16)
			const b2 = parseInt(color2.substring(5, 7), 16)

			const r = Math.round(r1 + factor * (r2 - r1))
			const g = Math.round(g1 + factor * (g2 - g1))
			const b = Math.round(b1 + factor * (b2 - b1))

			return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
		}

		// Aurora color palettes
		const colorSets = [
			["#1a2a6c", "#003366", "#00a6c0", "#00e6e6", "#66ffcc"], // Blue-green aurora
			["#330066", "#660099", "#9900cc", "#cc00ff", "#ff66ff"], // Purple aurora
			["#003300", "#006600", "#009900", "#00cc00", "#00ff00"], // Green aurora
		]

		let currentColorSet = colorSets[0]
		let transitionFactor = 0
		let targetColorSet = colorSets[0]

		// Wave control variables
		class Wave {
			points: number[]
			baseY: number
			height: number
			initialHeight: number
			frequency: number
			speed: number
			color: string
			thickness: number
			phase: number
			targetHeight: number
			heightChangeFactor: number = 0.05 // Reduced for more stability

			constructor(baseY: number, height: number, frequency: number, speed: number, color: string, thickness: number) {
				this.points = Array(100).fill(0)
				this.baseY = baseY
				this.height = height
				this.initialHeight = height // Store initial height for reset
				this.frequency = frequency
				this.speed = speed
				this.color = color
				this.thickness = thickness
				this.phase = rand(0, Math.PI * 2)
				this.targetHeight = height
			}

			update(deltaTime: number, energyFactor: number = 0) {
				this.phase += this.speed * deltaTime
				if (this.phase > Math.PI * 2) this.phase -= Math.PI * 2

				// Update target height based on energy but with limits to prevent instability
				this.targetHeight = this.height * Math.min(4, Math.max(0.1, 1 + energyFactor * 3))

				// Smooth transition to target height with stabilization
				const heightDiff = this.targetHeight - this.height
				this.height += heightDiff * Math.min(1, this.heightChangeFactor * deltaTime * 30)

				// Add stability bounds
				if (isNaN(this.height) || !isFinite(this.height)) this.height = 0.05

				// Generate wave points
				for (let i = 0; i < this.points.length; i++) {
					const x = i / (this.points.length - 1)
					const waveFactor = Math.sin(x * this.frequency + this.phase)
					this.points[i] = waveFactor * this.height
				}
			}

			draw(ctx: CanvasRenderingContext2D, width: number, height: number) {
				ctx.beginPath()

				// Create gradient along the wave
				const gradient = ctx.createLinearGradient(0, 0, width, 0)
				gradient.addColorStop(0, this.color)
				gradient.addColorStop(0.5, lerpColor(this.color, "#ffffff", 0.3))
				gradient.addColorStop(1, this.color)

				ctx.strokeStyle = gradient
				ctx.lineWidth = this.thickness
				ctx.lineJoin = "round"

				// Draw the wave
				for (let i = 0; i < this.points.length; i++) {
					const x = (i / (this.points.length - 1)) * width
					const y = height * this.baseY + this.points[i]

					if (i === 0) {
						ctx.moveTo(x, y)
					} else {
						ctx.lineTo(x, y)
					}
				}

				ctx.stroke()
			}
		}

		// Create waves
		const waves: Wave[] = []
		const numWaves = 8

		for (let i = 0; i < numWaves; i++) {
			const baseY = 0.2 + (i / numWaves) * 0.6
			const height = 0.03 + (i / numWaves) * 0.03
			const frequency = rand(3, 6)
			const speed = rand(0.2, 0.8)
			const color = currentColorSet[i % currentColorSet.length]
			const thickness = 2 + Math.floor(rand(1, 5))

			waves.push(new Wave(baseY, height, frequency, speed, color, thickness))
		}

		// Stars for background
		class Star {
			x: number
			y: number
			size: number
			pulse: number
			pulseSpeed: number

			constructor() {
				this.x = rand(0, 1)
				this.y = rand(0, 1)
				this.size = rand(0.5, 2)
				this.pulse = rand(0, Math.PI * 2)
				this.pulseSpeed = rand(1, 3)
			}

			update(deltaTime: number) {
				this.pulse += this.pulseSpeed * deltaTime
				if (this.pulse > Math.PI * 2) this.pulse -= Math.PI * 2
			}

			draw(ctx: CanvasRenderingContext2D, width: number, height: number) {
				const pulseFactor = 0.5 + 0.5 * Math.sin(this.pulse)
				const size = this.size * pulseFactor

				ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + 0.5 * pulseFactor})`
				ctx.beginPath()
				ctx.arc(this.x * width, this.y * height, size, 0, Math.PI * 2)
				ctx.fill()
			}
		}

		const stars = Array.from({length: 100}).map(() => new Star())
		let beatDetected = false
		let beatEnergy = 0
		let beatDecay = 0.9
		let sectionChanged = false
		let lastColorChangeTime = 0

		// Main render function
		return (deltaTime, music) => {
			// Cap deltaTime to prevent instability during pauses or lag
			deltaTime = Math.min(deltaTime, 0.1)

			ctx.clearRect(0, 0, canvas.width, canvas.height)

			// Draw background gradient
			const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
			bgGradient.addColorStop(0, "#000514")
			bgGradient.addColorStop(1, "#051036")
			ctx.fillStyle = bgGradient
			ctx.fillRect(0, 0, canvas.width, canvas.height)

			// Draw stars
			stars.forEach((star) => {
				star.update(deltaTime)
				star.draw(ctx, canvas.width, canvas.height)
			})

			// Process audio data
			let lowEnergy = 0
			let midEnergy = 0
			let highEnergy = 0
			let loudness = 0

			if (music) {
				// Handle beat events
				if (music.changed.beat && music.beat.current) {
					beatDetected = true
					beatEnergy = Math.min(1, music.beat.current.perceivedLoudness * 2)
				}

				// Handle section changes
				if (music.changed.section && music.section.current) {
					sectionChanged = true

					// Change color palette on section change with sufficient loudness
					if (music.section.current.perceivedLoudness.avg > 0.5 && Date.now() - lastColorChangeTime > 5000) {
						const randomIndex = Math.floor(rand(0, colorSets.length))
						targetColorSet = colorSets[randomIndex]
						transitionFactor = 0
						lastColorChangeTime = Date.now()

						// Reset wave heights on section change to prevent instability
						waves.forEach((wave) => {
							wave.height = wave.initialHeight
							wave.targetHeight = wave.initialHeight
						})
					}
				}

				// Extract energy values from current segment
				if (music.segment.current) {
					lowEnergy = Math.min(1, music.segment.current.lowEnergy)
					midEnergy = Math.min(1, music.segment.current.midEnergy)
					highEnergy = Math.min(1, music.segment.current.highEnergy)
					loudness = Math.min(1, music.segment.current.perceivedLoudness)
				}
			}

			// Reset beat energy with proper decay
			beatEnergy *= Math.pow(beatDecay, deltaTime * 10)
			beatEnergy = Math.max(0, Math.min(1, beatEnergy)) // Clamp between 0 and 1

			// Update color transition
			if (transitionFactor < 1) {
				transitionFactor += deltaTime * 0.5
				if (transitionFactor > 1) transitionFactor = 1

				// Update wave colors during transition
				for (let i = 0; i < waves.length; i++) {
					const originalColor = currentColorSet[i % currentColorSet.length]
					const targetColor = targetColorSet[i % targetColorSet.length]
					waves[i].color = lerpColor(originalColor, targetColor, transitionFactor)
				}

				if (transitionFactor === 1) {
					currentColorSet = targetColorSet
				}
			}

			// Update and draw waves
			for (let i = 0; i < waves.length; i++) {
				const wave = waves[i]

				// Make waves respond differently to different frequency energies
				let energyFactor = 0
				if (i < 3) {
					// Lower waves respond to bass
					energyFactor = Math.min(1, lowEnergy * 2)
				} else if (i < 6) {
					// Middle waves respond to mids
					energyFactor = Math.min(1, midEnergy * 1.5)
				} else {
					// Higher waves respond to highs
					energyFactor = Math.min(1, highEnergy)
				}

				// Add beat energy for pulsing effect with limits
				energyFactor += Math.min(0.5, beatEnergy * 0.3)

				wave.update(deltaTime, energyFactor)
				wave.draw(ctx, canvas.width, canvas.height)
			}

			// Reset flags
			beatDetected = false
			sectionChanged = false
		}
	},
})
