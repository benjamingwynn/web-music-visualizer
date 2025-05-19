import {MusicCanvas} from "../audio/canvas.ts"

MusicCanvas.registerVisualization("aurora-pulse", {
	info: {
		name: "Aurora Pulse",
		author: "Claude 3.7 Sonnet",
		description: "A dynamic aurora-like visualization that pulses and shifts with the music",
	},
	does: (canvas) => {
		const ctx = canvas.getContext("2d")
		if (!ctx) throw new Error("Could not create 2D canvas context")

		// Helper functions
		function rand(min: number, max: number): number {
			return Math.random() * (max - min) + min
		}

		function lerp(start: number, end: number, amt: number): number {
			return (1 - amt) * start + amt * end
		}

		// Color palette
		const colors = [
			"rgba(70, 130, 180, 0.7)", // Steel Blue
			"rgba(123, 104, 238, 0.7)", // Medium Slate Blue
			"rgba(147, 112, 219, 0.7)", // Medium Purple
			"rgba(65, 105, 225, 0.7)", // Royal Blue
			"rgba(0, 191, 255, 0.7)", // Deep Sky Blue
			"rgba(0, 250, 154, 0.7)", // Medium Spring Green
		]

		class AuroraWave {
			x: number
			y: number
			width: number
			height: number
			color: string
			phaseOffset: number
			amplitude: number
			frequency: number
			speed: number
			intensity: number = 0.5
			targetIntensity: number = 0.5

			constructor(x: number, y: number, width: number, height: number) {
				this.x = x
				this.y = y
				this.width = width
				this.height = height
				this.color = colors[Math.floor(Math.random() * colors.length)]
				this.phaseOffset = rand(0, Math.PI * 2)
				this.amplitude = rand(0.1, 0.3)
				this.frequency = rand(1, 3)
				this.speed = rand(0.0005, 0.002)
			}

			update(deltaTime: number, energy: number = 0) {
				this.phaseOffset += this.speed * deltaTime
				this.targetIntensity = 0.3 + energy * 0.7
				this.intensity = lerp(this.intensity, this.targetIntensity, 0.1)
			}

			draw(ctx: CanvasRenderingContext2D) {
				const points: [number, number][] = []
				const steps = 20
				const xStep = this.width / steps

				// Create wave points
				for (let i = 0; i <= steps; i++) {
					const xPos = this.x + i * xStep
					const yOffset = Math.sin(i * this.frequency + this.phaseOffset) * this.amplitude * this.height * this.intensity
					points.push([xPos, this.y + yOffset])
				}

				// Create gradient
				const gradient = ctx.createLinearGradient(this.x, this.y - this.height / 2, this.x, this.y + this.height / 2)
				const colorWithOpacity = this.color.replace(/[\d.]+\)$/g, `${0.7 * this.intensity})`)
				gradient.addColorStop(0, colorWithOpacity.replace(/[\d.]+\)$/g, "0)"))
				gradient.addColorStop(0.5, colorWithOpacity)
				gradient.addColorStop(1, colorWithOpacity.replace(/[\d.]+\)$/g, "0)"))

				// Draw the aurora wave
				ctx.beginPath()
				ctx.moveTo(points[0][0], points[0][1] - this.height / 2)

				for (let i = 1; i < points.length; i++) {
					ctx.lineTo(points[i][0], points[i][1] - this.height / 2)
				}

				for (let i = points.length - 1; i >= 0; i--) {
					ctx.lineTo(points[i][0], points[i][1] + this.height / 2)
				}

				ctx.closePath()
				ctx.fillStyle = gradient
				ctx.fill()
			}
		}

		class StarParticle {
			x: number
			y: number
			size: number
			opacity: number
			pulse: number
			pulseSpeed: number

			constructor() {
				this.x = rand(0, canvas.width)
				this.y = rand(0, canvas.height)
				this.size = rand(1, 3)
				this.opacity = rand(0.1, 0.9)
				this.pulse = rand(0, Math.PI * 2)
				this.pulseSpeed = rand(0.001, 0.005)
			}

			update(deltaTime: number, beat: number = 0) {
				this.pulse += this.pulseSpeed * deltaTime
				this.opacity = 0.3 + 0.7 * Math.sin(this.pulse) + beat * 0.3
				this.opacity = Math.min(1, Math.max(0.1, this.opacity))
			}

			draw(ctx: CanvasRenderingContext2D) {
				ctx.beginPath()
				ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
				ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`
				ctx.fill()
			}
		}

		// Create aurora waves
		const numWaves = 8
		const waves: AuroraWave[] = []

		for (let i = 0; i < numWaves; i++) {
			const y = (canvas.height * (i + 1)) / (numWaves + 1)
			waves.push(new AuroraWave(0, y, canvas.width, (canvas.height / (numWaves + 1)) * 1.5))
		}

		// Create stars
		const numStars = 100
		const stars: StarParticle[] = []

		for (let i = 0; i < numStars; i++) {
			stars.push(new StarParticle())
		}

		// Music response state
		let beatEnergy = 0
		let overallEnergy = 0
		let hueRotation = 0

		return (deltaTime, music) => {
			// Resize canvas if needed
			if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
				canvas.width = canvas.clientWidth
				canvas.height = canvas.clientHeight

				// Update waves positions when canvas resizes
				for (let i = 0; i < waves.length; i++) {
					waves[i].y = (canvas.height * (i + 1)) / (numWaves + 1)
					waves[i].width = canvas.width
					waves[i].height = (canvas.height / (numWaves + 1)) * 1.5
				}
			}

			// Clear canvas with a dark background
			ctx.fillStyle = "rgb(10, 15, 30)"
			ctx.fillRect(0, 0, canvas.width, canvas.height)

			// Process music data
			if (music) {
				// React to beat
				if (music.changed.beat && music.beat.current) {
					beatEnergy = music.beat.current.perceivedLoudness * 0.7
					hueRotation += 5 * music.beat.current.perceivedLoudness
				}

				// Get overall energy from segments
				if (music.segment.current) {
					const segment = music.segment.current
					overallEnergy = (segment.lowEnergy * 0.5 + segment.midEnergy * 0.3 + segment.highEnergy * 0.2) * 1.5
					overallEnergy = Math.min(1, overallEnergy)
				}

				// Decay beat energy
				beatEnergy *= Math.pow(0.9, deltaTime / 16)
			}

			// Draw stars
			for (const star of stars) {
				star.update(deltaTime, beatEnergy)
				star.draw(ctx)
			}

			// Apply hue rotation effect during strong beats
			if (beatEnergy > 0.1) {
				ctx.filter = `hue-rotate(${hueRotation % 360}deg)`
			} else {
				ctx.filter = "none"
			}

			// Draw and update aurora waves
			for (const wave of waves) {
				wave.update(deltaTime, overallEnergy)
				wave.draw(ctx)
			}

			// Reset filter
			ctx.filter = "none"
		}
	},
})
