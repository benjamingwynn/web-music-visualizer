import {MusicCanvas} from "../audio/canvas.ts"

MusicCanvas.registerVisualization("aquaticRhythm", {
	info: {
		name: "Aquatic Rhythm",
		author: "Claude 3.7 Sonnet",
		description: "An underwater ecosystem that evolves and dances to the rhythm of music, featuring bioluminescent creatures and dynamic water currents",
	},
	does: (canvas) => {
		const ctx = canvas.getContext("2d")
		if (!ctx) throw new Error("Could not create 2D canvas context")

		// Helper functions
		function rand(min: number, max: number): number {
			return Math.random() * (max - min) + min
		}

		function randInt(min: number, max: number): number {
			return Math.floor(rand(min, max))
		}

		function easeInOut(t: number): number {
			return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
		}

		// Water color gradients based on depth and mood
		const waterGradients = {
			shallow: ["#00B4DB", "#0083B0", "#006285"],
			deep: ["#1A2980", "#26D0CE", "#1E3C72"],
			mystical: ["#4B0082", "#8A2BE2", "#9400D3"],
		}

		let currentGradient = waterGradients.shallow
		let waterMovement = 0
		let currentsIntensity = 0.2
		let bubbleRate = 0.1

		// Bubble particles that float upward
		class Bubble {
			x: number
			y: number
			size: number
			speed: number
			wobble: number
			wobbleSpeed: number
			wobbleDir: number
			opacity: number

			constructor() {
				this.x = rand(0, 1)
				this.y = 1 + rand(0, 0.5) // Start below the canvas
				this.size = rand(0.002, 0.015)
				this.speed = rand(0.00005, 0.0002)
				this.wobble = 0
				this.wobbleSpeed = rand(0.001, 0.003)
				this.wobbleDir = 1
				this.opacity = rand(0.3, 0.8)
			}

			update(deltaTime: number, currentSpeed: number) {
				// Move upward
				this.y -= (this.speed + currentSpeed * 0.0001) * deltaTime

				// Add side-to-side wobble
				this.wobble += this.wobbleSpeed * deltaTime * this.wobbleDir
				if (Math.abs(this.wobble) > 1) {
					this.wobbleDir *= -1
				}

				this.x += this.wobble * 0.0001 * deltaTime

				// Reset if out of bounds
				if (this.y < -0.1) {
					this.y = 1 + rand(0, 0.2)
					this.x = rand(0, 1)
					this.size = rand(0.002, 0.015)
				}
			}

			draw(ctx: CanvasRenderingContext2D, width: number, height: number) {
				const x = this.x * width
				const y = this.y * height
				const radius = this.size * Math.min(width, height)

				// Draw bubble with highlight
				ctx.beginPath()
				ctx.arc(x, y, radius, 0, Math.PI * 2)
				ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity * 0.5})`
				ctx.fill()

				// Draw highlight
				ctx.beginPath()
				ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.4, 0, Math.PI * 2)
				ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`
				ctx.fill()
			}
		}

		// Jellyfish that pulse with the music
		class Jellyfish {
			x: number
			y: number
			size: number
			tentacleCount: number
			tentacleLength: number
			phase: number
			phaseSpeed: number
			color: string
			glowColor: string
			pulseSize: number
			direction: number

			constructor() {
				this.x = rand(0.1, 0.9)
				this.y = rand(0.1, 0.7)
				this.size = rand(0.03, 0.08)
				this.tentacleCount = randInt(5, 10)
				this.tentacleLength = rand(0.05, 0.12)
				this.phase = rand(0, Math.PI * 2)
				this.phaseSpeed = rand(0.0005, 0.001)
				this.color = `hsl(${randInt(180, 280)}, ${randInt(60, 100)}%, ${randInt(40, 80)}%)`
				this.glowColor = `hsl(${randInt(180, 280)}, ${randInt(80, 100)}%, ${randInt(60, 90)}%)`
				this.pulseSize = 1
				this.direction = Math.random() < 0.5 ? -1 : 1
			}

			pulse(intensity: number) {
				this.pulseSize = 1 + intensity * 0.5
			}

			update(deltaTime: number, currents: number) {
				// Gentle drift in currents
				this.x += Math.sin(this.phase) * 0.00005 * deltaTime * currents
				this.y += Math.cos(this.phase * 0.7) * 0.00003 * deltaTime * currents

				// Keep within bounds
				if (this.x < 0.1) this.x += 0.001
				if (this.x > 0.9) this.x -= 0.001
				if (this.y < 0.1) this.y += 0.001
				if (this.y > 0.9) this.y -= 0.001

				// Update phase for tentacle movement
				this.phase += this.phaseSpeed * deltaTime * this.direction
			}

			draw(ctx: CanvasRenderingContext2D, width: number, height: number) {
				const x = this.x * width
				const y = this.y * height
				const radius = this.size * Math.min(width, height) * this.pulseSize

				// Draw glow
				const glowRadius = radius * 1.5
				const glow = ctx.createRadialGradient(x, y, 0, x, y, glowRadius)
				glow.addColorStop(0, `${this.glowColor}`)
				glow.addColorStop(1, `${this.glowColor}`)

				ctx.beginPath()
				ctx.arc(x, y, glowRadius, 0, Math.PI * 2)
				ctx.fillStyle = glow
				ctx.fill()

				// Draw bell
				ctx.beginPath()
				ctx.arc(x, y, radius, Math.PI, 0)
				ctx.lineTo(x - radius, y)
				ctx.fillStyle = this.color
				ctx.fill()

				// Draw tentacles
				for (let i = 0; i < this.tentacleCount; i++) {
					const angle = (i / this.tentacleCount) * Math.PI
					const tentacleX = x - radius * Math.cos(angle)
					const startY = y + radius * Math.sin(angle) * 0.2

					ctx.beginPath()
					ctx.moveTo(tentacleX, startY)

					// Wavy tentacle with phase offset
					const segments = 10
					const tentacleLength = this.tentacleLength * Math.min(width, height)

					for (let j = 1; j <= segments; j++) {
						const segmentY = startY + (j / segments) * tentacleLength
						const waveOffset = Math.sin(this.phase + j * 0.5) * 10

						ctx.lineTo(tentacleX + waveOffset, segmentY)
					}

					ctx.lineWidth = radius * 0.05
					ctx.strokeStyle = this.color
					ctx.stroke()
				}
			}
		}

		// Bioluminescent plankton that react to high frequencies
		class Plankton {
			x: number
			y: number
			size: number
			color: string
			brightness: number
			fadeSpeed: number

			constructor() {
				this.x = rand(0, 1)
				this.y = rand(0, 1)
				this.size = rand(0.001, 0.004)
				this.color = `hsl(${randInt(180, 220)}, 100%, 70%)`
				this.brightness = 0
				this.fadeSpeed = rand(0.01, 0.02)
			}

			glow(intensity: number) {
				this.brightness = Math.min(1, this.brightness + intensity * 2)
			}

			update(deltaTime: number, currents: number) {
				// Drift in water currents
				this.x += rand(-0.0001, 0.0001) * currents * deltaTime
				this.y += rand(-0.0001, 0.0001) * currents * deltaTime

				// Wrap around edges
				if (this.x < 0) this.x = 1
				if (this.x > 1) this.x = 0
				if (this.y < 0) this.y = 1
				if (this.y > 1) this.y = 0

				// Fade out gradually
				this.brightness = Math.max(0, this.brightness - this.fadeSpeed * (deltaTime / 1000))
			}

			draw(ctx: CanvasRenderingContext2D, width: number, height: number) {
				if (this.brightness <= 0) return

				const x = this.x * width
				const y = this.y * height
				const radius = this.size * Math.min(width, height)

				// Draw glow
				const glowRadius = radius * (3 + this.brightness * 5)
				const glow = ctx.createRadialGradient(x, y, 0, x, y, glowRadius)
				glow.addColorStop(0, `${this.color}`)
				glow.addColorStop(1, `${this.color}`)

				ctx.beginPath()
				ctx.arc(x, y, glowRadius, 0, Math.PI * 2)
				ctx.fillStyle = glow
				ctx.fill()

				// Draw core
				ctx.beginPath()
				ctx.arc(x, y, radius, 0, Math.PI * 2)
				ctx.fillStyle = `rgba(255, 255, 255, ${this.brightness})`
				ctx.fill()
			}
		}

		// Seaweed that sways with the music
		class Seaweed {
			x: number
			baseY: number
			segments: number
			segmentLength: number
			width: number
			phase: number
			phaseSpeed: number
			points: {x: number; y: number}[]
			color: string

			constructor() {
				this.x = rand(0.05, 0.95)
				this.baseY = 1 // Bottom of screen
				this.segments = randInt(8, 15)
				this.segmentLength = rand(0.01, 0.03)
				this.width = rand(0.005, 0.015)
				this.phase = rand(0, Math.PI * 2)
				this.phaseSpeed = rand(0.0005, 0.001)
				this.points = []
				this.color = `hsl(${randInt(100, 160)}, ${randInt(70, 100)}%, ${randInt(20, 40)}%)`

				// Initialize points
				this.updatePoints(0, 0)
			}

			updatePoints(deltaTime: number, waveIntensity: number) {
				this.phase += this.phaseSpeed * deltaTime

				this.points = []
				let currentY = this.baseY

				for (let i = 0; i < this.segments; i++) {
					const progress = i / this.segments
					const waveAmount = Math.sin(this.phase + progress * Math.PI) * waveIntensity * (1 - progress)

					this.points.push({
						x: this.x + waveAmount * 0.05,
						y: currentY - this.segmentLength,
					})

					currentY -= this.segmentLength
				}
			}

			draw(ctx: CanvasRenderingContext2D, width: number, height: number) {
				if (this.points.length < 2) return

				const seaweedWidth = this.width * Math.min(width, height)

				// Draw seaweed as a path
				ctx.beginPath()
				ctx.moveTo(this.x * width, this.baseY * height)

				for (const point of this.points) {
					ctx.lineTo(point.x * width, point.y * height)
				}

				ctx.lineWidth = seaweedWidth
				ctx.lineCap = "round"
				ctx.lineJoin = "round"
				ctx.strokeStyle = this.color
				ctx.stroke()
			}
		}

		// Fish that swim in schools and respond to beats
		class Fish {
			x: number
			y: number
			size: number
			speed: number
			color: string
			direction: number
			targetX: number
			targetY: number
			excited: number
			schoolId: number

			constructor(schoolId: number) {
				this.x = rand(0, 1)
				this.y = rand(0, 1)
				this.size = rand(0.01, 0.02)
				this.speed = rand(0.0001, 0.0003)
				this.color = `hsl(${randInt(0, 60)}, ${randInt(70, 100)}%, ${randInt(40, 60)}%)`
				this.direction = rand(0, Math.PI * 2)
				this.targetX = this.x
				this.targetY = this.y
				this.excited = 0
				this.schoolId = schoolId
			}

			excite(amount: number) {
				this.excited = Math.min(1, this.excited + amount)
			}

			update(deltaTime: number, schoolX: number, schoolY: number) {
				// Move toward school center with some randomness
				this.targetX = schoolX + rand(-0.1, 0.1)
				this.targetY = schoolY + rand(-0.1, 0.1)

				// Gradually adjust direction toward target
				const targetAngle = Math.atan2(this.targetY - this.y, this.targetX - this.x)
				const angleDiff = targetAngle - this.direction

				// Normalize angle difference
				let normalizedDiff = angleDiff
				while (normalizedDiff < -Math.PI) normalizedDiff += Math.PI * 2
				while (normalizedDiff > Math.PI) normalizedDiff -= Math.PI * 2

				// Adjust direction gradually
				this.direction += normalizedDiff * 0.01 * deltaTime

				// Move in current direction
				const currentSpeed = this.speed * (1 + this.excited * 3)
				this.x += Math.cos(this.direction) * currentSpeed * deltaTime
				this.y += Math.sin(this.direction) * currentSpeed * deltaTime

				// Contain within bounds with a buffer
				const buffer = 0.05
				if (this.x < buffer) this.x = buffer
				if (this.x > 1 - buffer) this.x = 1 - buffer
				if (this.y < buffer) this.y = buffer
				if (this.y > 1 - buffer) this.y = 1 - buffer

				// Reduce excitement over time
				this.excited = Math.max(0, this.excited - 0.001 * deltaTime)
			}

			draw(ctx: CanvasRenderingContext2D, width: number, height: number) {
				const x = this.x * width
				const y = this.y * height
				const fishSize = this.size * Math.min(width, height) * (1 + this.excited * 0.5)

				ctx.save()
				ctx.translate(x, y)
				ctx.rotate(this.direction)

				// Draw fish body
				ctx.beginPath()
				ctx.moveTo(fishSize, 0)
				ctx.lineTo(-fishSize, fishSize / 2)
				ctx.lineTo(-fishSize, -fishSize / 2)
				ctx.closePath()
				ctx.fillStyle = this.color
				ctx.fill()

				// Draw tail
				ctx.beginPath()
				ctx.moveTo(-fishSize, 0)
				ctx.lineTo(-fishSize * 1.5, fishSize / 2)
				ctx.lineTo(-fishSize * 1.5, -fishSize / 2)
				ctx.closePath()
				ctx.fillStyle = this.color
				ctx.fill()

				ctx.restore()
			}
		}

		// Fish school that moves as a unit
		class FishSchool {
			x: number
			y: number
			targetX: number
			targetY: number
			changeDirectionCounter: number
			fish: Fish[]

			constructor(fishCount: number) {
				this.x = rand(0.2, 0.8)
				this.y = rand(0.2, 0.8)
				this.targetX = rand(0.2, 0.8)
				this.targetY = rand(0.2, 0.8)
				this.changeDirectionCounter = 0

				// Create fish in this school
				this.fish = []
				for (let i = 0; i < fishCount; i++) {
					this.fish.push(new Fish(i))
				}
			}

			exciteFish(amount: number) {
				for (const fish of this.fish) {
					fish.excite(amount)
				}
			}

			update(deltaTime: number) {
				// Update school position
				this.changeDirectionCounter -= deltaTime

				if (this.changeDirectionCounter <= 0) {
					this.targetX = rand(0.2, 0.8)
					this.targetY = rand(0.2, 0.8)
					this.changeDirectionCounter = rand(5000, 10000) // Change direction every 5-10 seconds
				}

				// Move toward target gradually
				const moveSpeed = 0.00002 * deltaTime
				this.x += (this.targetX - this.x) * moveSpeed
				this.y += (this.targetY - this.y) * moveSpeed

				// Update all fish
				for (const fish of this.fish) {
					fish.update(deltaTime, this.x, this.y)
				}
			}

			draw(ctx: CanvasRenderingContext2D, width: number, height: number) {
				for (const fish of this.fish) {
					fish.draw(ctx, width, height)
				}
			}
		}

		// Initialize underwater scene
		const bubbles: Bubble[] = Array.from({length: 50}, () => new Bubble())
		const jellyfish: Jellyfish[] = Array.from({length: 5}, () => new Jellyfish())
		const plankton: Plankton[] = Array.from({length: 200}, () => new Plankton())
		const seaweed: Seaweed[] = Array.from({length: 15}, () => new Seaweed())
		const fishSchools: FishSchool[] = [new FishSchool(12), new FishSchool(8), new FishSchool(15)]

		// Variables to track music features
		let currentEnergy = 0
		let bassEnergy = 0
		let midEnergy = 0
		let highEnergy = 0
		let beatStrength = 0
		let beatCount = 0
		let beatTimer = 0

		// Water caustics effect
		let causticsPhase = 0
		let causticsIntensity = 0.3

		// Create off-screen canvas for caustics
		const causticsCanvas = document.createElement("canvas")
		const causticsCtx = causticsCanvas.getContext("2d")

		function resizeCaustics() {
			causticsCanvas.width = canvas.width
			causticsCanvas.height = canvas.height
		}

		function updateCaustics(deltaTime: number) {
			if (!causticsCtx) return

			causticsPhase += 0.0005 * deltaTime

			causticsCtx.clearRect(0, 0, causticsCanvas.width, causticsCanvas.height)

			// Create water caustics effect
			for (let i = 0; i < 3; i++) {
				const offset = (i * Math.PI * 2) / 3

				causticsCtx.beginPath()

				// Draw a sine wave grid
				for (let x = 0; x < causticsCanvas.width; x += 20) {
					for (let y = 0; y < causticsCanvas.height; y += 20) {
						const distX = Math.sin(causticsPhase + offset + x * 0.01) * 10
						const distY = Math.cos(causticsPhase + offset + y * 0.01) * 10

						causticsCtx.fillStyle = `rgba(255, 255, 255, ${0.03 * causticsIntensity})`
						causticsCtx.fillRect(x + distX, y + distY, 15, 15)
					}
				}
			}
		}

		// Initialize caustics canvas
		resizeCaustics()

		// Function to draw water background
		function drawWaterBackground(ctx: CanvasRenderingContext2D, width: number, height: number) {
			// Create water gradient
			const gradient = ctx.createLinearGradient(0, 0, 0, height)

			for (let i = 0; i < currentGradient.length; i++) {
				gradient.addColorStop(i / (currentGradient.length - 1), currentGradient[i])
			}

			ctx.fillStyle = gradient
			ctx.fillRect(0, 0, width, height)

			// Apply caustics
			ctx.globalCompositeOperation = "lighter"
			ctx.drawImage(causticsCanvas, 0, 0)
			ctx.globalCompositeOperation = "source-over"
		}

		// Main render function
		return (deltaTime, music) => {
			// Resize caustics if canvas size changes
			if (causticsCanvas.width !== canvas.width || causticsCanvas.height !== canvas.height) {
				resizeCaustics()
			}

			// Apply music data when available
			if (music) {
				// Track energy changes from segments
				if (music.segment.current) {
					bassEnergy = music.segment.current.lowEnergy * 2
					midEnergy = music.segment.current.midEnergy * 1.5
					highEnergy = music.segment.current.highEnergy

					currentEnergy = music.segment.current.perceivedLoudness

					// Update water effects based on frequencies
					currentsIntensity = 0.2 + bassEnergy * 1.5
					bubbleRate = 0.1 + midEnergy * 0.5
					causticsIntensity = 0.3 + highEnergy

					// Make plankton glow with high frequencies
					if (highEnergy > 0.4) {
						const glowCount = Math.floor(highEnergy * 30)
						for (let i = 0; i < glowCount; i++) {
							const randomPlankton = plankton[randInt(0, plankton.length)]
							randomPlankton.glow(highEnergy)
						}
					}
				}

				// Track section changes
				if (music.changed.section && music.section.current) {
					const sectionEnergy = music.section.current.perceivedLoudness.avg

					// Change water gradient based on section energy
					if (sectionEnergy > 0.7) {
						currentGradient = waterGradients.mystical
					} else if (sectionEnergy > 0.4) {
						currentGradient = waterGradients.deep
					} else {
						currentGradient = waterGradients.shallow
					}
				}

				// Track beats
				if (music.changed.beat && music.beat.current) {
					beatCount++
					beatStrength = music.beat.current.perceivedLoudness
					beatTimer = 500 // Effect lasts for 500ms

					// Make jellyfish pulse
					for (const jelly of jellyfish) {
						jelly.pulse(beatStrength)
					}

					// Excite fish schools
					for (const school of fishSchools) {
						school.exciteFish(beatStrength * 0.5)
					}

					// Add water movement
					waterMovement = beatStrength * 0.3
				}
			}

			// Update caustics effect
			updateCaustics(deltaTime)

			// Decay beat effects
			if (beatTimer > 0) {
				beatTimer -= deltaTime
				if (beatTimer <= 0) {
					beatStrength = 0
				}
			}

			// Clear canvas
			ctx.clearRect(0, 0, canvas.width, canvas.height)

			// Draw water background
			drawWaterBackground(ctx, canvas.width, canvas.height)

			// Update and draw seaweed
			for (const plant of seaweed) {
				plant.updatePoints(deltaTime, 0.1 + waterMovement + bassEnergy * 0.5)
				plant.draw(ctx, canvas.width, canvas.height)
			}

			// Update and draw fish schools
			for (const school of fishSchools) {
				school.update(deltaTime)
				school.draw(ctx, canvas.width, canvas.height)
			}

			// Update and draw jellyfish
			for (const jelly of jellyfish) {
				jelly.update(deltaTime, currentsIntensity)
				jelly.draw(ctx, canvas.width, canvas.height)
			}

			// Update and draw bubbles
			for (const bubble of bubbles) {
				bubble.update(deltaTime, bubbleRate)
				bubble.draw(ctx, canvas.width, canvas.height)
			}

			// Update and draw plankton
			for (const p of plankton) {
				p.update(deltaTime, currentsIntensity)
				p.draw(ctx, canvas.width, canvas.height)
			}

			// Add surface light rays during high energy
			if (currentEnergy > 0.6) {
				const rayCount = Math.floor(currentEnergy * 5)

				for (let i = 0; i < rayCount; i++) {
					const rayX = rand(0, canvas.width)
					const rayWidth = rand(30, 100) * currentEnergy

					const gradient = ctx.createLinearGradient(rayX, 0, rayX, canvas.height * 0.7)
					gradient.addColorStop(0, `rgba(255, 255, 255, ${currentEnergy * 0.2})`)
					gradient.addColorStop(1, "rgba(255, 255, 255, 0)")

					ctx.beginPath()
					ctx.moveTo(rayX, 0)
					ctx.lineTo(rayX + rayWidth * 0.5, canvas.height * 0.7)
					ctx.lineTo(rayX - rayWidth * 0.5, canvas.height * 0.7)
					ctx.closePath()
					ctx.fillStyle = gradient
					ctx.fill()
				}
			}

			// Add water surface at the top with wave effect
			ctx.beginPath()
			ctx.moveTo(0, 0)

			// Draw wavy surface
			const waveCount = 6
			const waveHeight = 10 * (1 + waterMovement * 2)

			for (let i = 0; i <= waveCount; i++) {
				const x = (i / waveCount) * canvas.width
				const y = Math.sin(i + causticsPhase * 0.5) * waveHeight
				ctx.lineTo(x, y)
			}

			ctx.lineTo(canvas.width, 0)
			ctx.closePath()
			ctx.fillStyle = `rgba(0, 100, 255, 0.3)`
			ctx.fill()
		}
	},
})
