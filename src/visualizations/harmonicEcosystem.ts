import {MusicCanvas} from "../audio/canvas.ts"

MusicCanvas.registerVisualization("harmonic_ecosystem", {
	info: {
		name: "Harmonic Ecosystem",
		author: "Claude",
		description: "A living ecosystem where creatures and plants evolve and respond to music patterns",
	},
	does: (canvas) => {
		const ctx = canvas.getContext("2d")
		if (!ctx) throw new Error("Could not create 2D canvas context")

		// Utility functions
		function rand(min: number, max: number): number {
			return Math.random() * (max - min) + min
		}

		function randInt(min: number, max: number): number {
			return Math.floor(rand(min, max))
		}

		function clamp(value: number, min: number, max: number): number {
			return Math.min(Math.max(value, min), max)
		}

		// Color palette generation based on HSL for better visual harmony
		const colorPalettes = {
			underwater: {
				background: () => `hsl(${rand(180, 220)}, ${rand(60, 90)}%, ${rand(10, 30)}%)`,
				creature: () => `hsl(${rand(160, 240)}, ${rand(70, 100)}%, ${rand(40, 80)}%)`,
				plant: () => `hsl(${rand(100, 160)}, ${rand(40, 90)}%, ${rand(30, 70)}%)`,
				particle: () => `hsl(${rand(160, 240)}, ${rand(70, 100)}%, ${rand(60, 90)}%)`,
			},
			forest: {
				background: () => `hsl(${rand(90, 150)}, ${rand(20, 40)}%, ${rand(10, 30)}%)`,
				creature: () => `hsl(${rand(0, 60)}, ${rand(60, 100)}%, ${rand(40, 80)}%)`,
				plant: () => `hsl(${rand(60, 150)}, ${rand(40, 90)}%, ${rand(20, 70)}%)`,
				particle: () => `hsl(${rand(30, 60)}, ${rand(80, 100)}%, ${rand(60, 90)}%)`,
			},
			cosmic: {
				background: () => `hsl(${rand(220, 280)}, ${rand(60, 90)}%, ${rand(5, 15)}%)`,
				creature: () => `hsl(${rand(180, 360)}, ${rand(70, 100)}%, ${rand(50, 90)}%)`,
				plant: () => `hsl(${rand(180, 300)}, ${rand(40, 90)}%, ${rand(40, 80)}%)`,
				particle: () => `hsl(${rand(0, 360)}, ${rand(70, 100)}%, ${rand(60, 90)}%)`,
			},
		}

		// Choose a random theme
		const themes = Object.keys(colorPalettes)
		const activeTheme = themes[randInt(0, themes.length)]
		const palette = colorPalettes[activeTheme as keyof typeof colorPalettes]

		// Background color
		const backgroundColor = palette.background()

		// System state
		let systemEnergy = 0.5 // Overall system energy level
		let harmonicBalance = 0.5 // Balance between creature types
		let growthFactor = 0.1 // How quickly things grow/evolve
		const decayRate = 0.98 // How quickly effects decay
		let lastBeatTime = 0 // Track timing between beats
		let keySignature: number[] = [] // Musical key signature

		// Particle effects system
		class ParticleSystem {
			particles: Particle[] = []
			maxParticles = 200

			emit(x: number, y: number, count: number, force: number, color: string, lifespan: number) {
				for (let i = 0; i < count; i++) {
					if (this.particles.length < this.maxParticles) {
						this.particles.push(new Particle(x, y, force, color, lifespan))
					}
				}
			}

			update(deltaTime: number) {
				this.particles = this.particles.filter((p) => {
					p.update(deltaTime)
					return p.life > 0
				})
			}

			draw() {
				for (const particle of this.particles) {
					particle.draw()
				}
			}
		}

		class Particle {
			x: number
			y: number
			vx: number
			vy: number
			size: number
			color: string
			life: number
			maxLife: number

			constructor(x: number, y: number, force: number, color: string, lifespan: number) {
				this.x = x
				this.y = y
				const angle = rand(0, Math.PI * 2)
				const speed = rand(0.01, 0.05) * force
				this.vx = Math.cos(angle) * speed
				this.vy = Math.sin(angle) * speed
				this.size = rand(0.005, 0.015)
				this.color = color
				this.maxLife = lifespan
				this.life = lifespan
			}

			update(deltaTime: number) {
				this.x += this.vx * deltaTime
				this.y += this.vy * deltaTime
				this.life -= deltaTime

				// Apply some gravity
				this.vy += 0.0001 * deltaTime

				// Slow down
				this.vx *= Math.pow(0.99, deltaTime)
				this.vy *= Math.pow(0.99, deltaTime)
			}

			draw() {
				const alpha = this.life / this.maxLife
				ctx.globalAlpha = alpha
				ctx.fillStyle = this.color

				const radius = this.size * Math.min(canvas.width, canvas.height)
				ctx.beginPath()
				ctx.arc(this.x * canvas.width, this.y * canvas.height, radius, 0, Math.PI * 2)
				ctx.fill()
				ctx.globalAlpha = 1
			}
		}

		// Base class for all ecosystem entities
		class Entity {
			x: number
			y: number
			vx: number
			vy: number
			size: number
			energy: number
			color: string

			constructor() {
				this.x = rand(0, 1)
				this.y = rand(0, 1)
				this.vx = 0
				this.vy = 0
				this.size = rand(0.01, 0.03)
				this.energy = rand(0.3, 0.7)
				this.color = "white"
			}

			update(deltaTime: number) {
				// Will be implemented by subclasses
			}

			draw() {
				// Will be implemented by subclasses
			}

			bounceOffEdges() {
				const margin = 0.02

				if (this.x < margin) {
					this.x = margin
					this.vx *= -0.8
				} else if (this.x > 1 - margin) {
					this.x = 1 - margin
					this.vx *= -0.8
				}

				if (this.y < margin) {
					this.y = margin
					this.vy *= -0.8
				} else if (this.y > 1 - margin) {
					this.y = 1 - margin
					this.vy *= -0.8
				}
			}
		}

		// Creature - moves around, responds to beats
		class Creature extends Entity {
			type: number
			targetX: number
			targetY: number
			pulseSize: number
			lastPulse: number

			constructor(type: number) {
				super()
				this.type = type
				this.color = palette.creature()
				this.size = rand(0.02, 0.04)
				this.targetX = rand(0, 1)
				this.targetY = rand(0, 1)
				this.pulseSize = 0
				this.lastPulse = 0
			}

			update(deltaTime: number) {
				// Move toward target with some randomness
				const dx = this.targetX - this.x
				const dy = this.targetY - this.y
				const dist = Math.sqrt(dx * dx + dy * dy)

				if (dist < 0.05 || Math.random() < 0.01) {
					// Pick a new target
					this.targetX = rand(0.1, 0.9)
					this.targetY = rand(0.1, 0.9)
				} else {
					// Move toward target
					const speed = 0.0005 * systemEnergy
					this.vx += (dx / dist) * speed * deltaTime
					this.vy += (dy / dist) * speed * deltaTime
				}

				// Add some random movement
				if (Math.random() < 0.1) {
					this.vx += rand(-0.0005, 0.0005) * deltaTime
					this.vy += rand(-0.0005, 0.0005) * deltaTime
				}

				// Apply velocity
				this.x += this.vx * deltaTime
				this.y += this.vy * deltaTime

				// Dampen velocity
				this.vx *= Math.pow(0.99, deltaTime)
				this.vy *= Math.pow(0.99, deltaTime)

				// Handle edges
				this.bounceOffEdges()

				// Pulse decay
				this.pulseSize *= Math.pow(0.95, deltaTime)
				this.lastPulse -= deltaTime
			}

			draw() {
				const baseSize = this.size * Math.min(canvas.width, canvas.height)
				const pulseSize = baseSize * (1 + this.pulseSize)

				// Draw pulse glow if pulsing
				if (this.pulseSize > 0.1) {
					ctx.globalAlpha = this.pulseSize * 0.5
					ctx.fillStyle = this.color
					ctx.beginPath()
					ctx.arc(this.x * canvas.width, this.y * canvas.height, pulseSize * 1.5, 0, Math.PI * 2)
					ctx.fill()
					ctx.globalAlpha = 1
				}

				// Draw creature body
				ctx.fillStyle = this.color
				ctx.beginPath()

				// Different shapes for different creature types
				if (this.type === 0) {
					// Circle creatures
					ctx.arc(this.x * canvas.width, this.y * canvas.height, pulseSize, 0, Math.PI * 2)
				} else if (this.type === 1) {
					// Triangle creatures
					const centerX = this.x * canvas.width
					const centerY = this.y * canvas.height

					ctx.moveTo(centerX, centerY - pulseSize)
					ctx.lineTo(centerX - pulseSize * 0.866, centerY + pulseSize * 0.5)
					ctx.lineTo(centerX + pulseSize * 0.866, centerY + pulseSize * 0.5)
				} else {
					// Square creatures
					const halfSize = pulseSize * 0.7
					ctx.rect(this.x * canvas.width - halfSize, this.y * canvas.height - halfSize, halfSize * 2, halfSize * 2)
				}

				ctx.fill()
			}

			pulse(intensity: number) {
				if (this.lastPulse <= 0) {
					this.pulseSize = intensity
					this.lastPulse = 20 // Cooldown
					return true
				}
				return false
			}
		}

		// Plant - stationary, grows with music sections
		class Plant extends Entity {
			segments: number
			segmentLengths: number[]
			segmentAngles: number[]
			targetSize: number
			growthRate: number

			constructor() {
				super()
				this.color = palette.plant()
				this.size = rand(0.01, 0.02)
				this.targetSize = this.size
				this.growthRate = rand(0.0005, 0.002)

				// Create a branching structure
				this.segments = randInt(3, 8)
				this.segmentLengths = Array(this.segments)
					.fill(0)
					.map(() => rand(0.5, 1))
				this.segmentAngles = Array(this.segments)
					.fill(0)
					.map(() => rand(-Math.PI / 4, Math.PI / 4))
			}

			update(deltaTime: number) {
				// Grow toward target size
				if (this.size < this.targetSize) {
					this.size += this.growthRate * deltaTime * growthFactor
					if (this.size > this.targetSize) {
						this.size = this.targetSize
					}
				}

				// Gentle swaying motion
				for (let i = 0; i < this.segments; i++) {
					this.segmentAngles[i] += Math.sin(Date.now() / 2000 + i) * 0.0001 * deltaTime
				}
			}

			draw() {
				const baseSize = this.size * Math.min(canvas.width, canvas.height) * 2

				ctx.strokeStyle = this.color
				ctx.lineWidth = baseSize * 0.15
				ctx.lineCap = "round"

				// Draw branching structure
				this.drawBranch(this.x * canvas.width, this.y * canvas.height, baseSize, -Math.PI / 2, 0)
			}

			drawBranch(x: number, y: number, length: number, angle: number, depth: number) {
				if (depth >= this.segments) return

				const segmentLength = length * this.segmentLengths[depth]
				const endX = x + Math.cos(angle) * segmentLength
				const endY = y + Math.sin(angle) * segmentLength

				// Draw this segment
				ctx.beginPath()
				ctx.moveTo(x, y)
				ctx.lineTo(endX, endY)
				ctx.stroke()

				// Draw branches if not at a leaf
				if (depth < this.segments - 1) {
					const branchAngle = this.segmentAngles[depth]
					this.drawBranch(endX, endY, length * 0.7, angle + branchAngle, depth + 1)
					this.drawBranch(endX, endY, length * 0.7, angle - branchAngle, depth + 1)
				} else {
					// Draw a "flower" at the end
					ctx.fillStyle = this.color
					ctx.beginPath()
					ctx.arc(endX, endY, length * 0.2, 0, Math.PI * 2)
					ctx.fill()
				}
			}

			grow(amount: number) {
				this.targetSize += amount
				this.targetSize = Math.min(this.targetSize, 0.08) // Cap maximum size
			}
		}

		// Create ecosystem elements
		const creatures: Creature[] = []
		const plants: Plant[] = []
		const particleSystem = new ParticleSystem()

		// Initial population
		for (let i = 0; i < 10; i++) {
			creatures.push(new Creature(i % 3))
		}

		for (let i = 0; i < 15; i++) {
			plants.push(new Plant())
		}

		// Create background with perlin-like noise
		const backgroundCanvas = document.createElement("canvas")
		backgroundCanvas.width = canvas.width
		backgroundCanvas.height = canvas.height
		const bgCtx = backgroundCanvas.getContext("2d")

		if (bgCtx) {
			bgCtx.fillStyle = backgroundColor
			bgCtx.fillRect(0, 0, backgroundCanvas.width, backgroundCanvas.height)

			// Add some texture
			const cellSize = 20
			const cols = Math.ceil(backgroundCanvas.width / cellSize)
			const rows = Math.ceil(backgroundCanvas.height / cellSize)

			for (let y = 0; y < rows; y++) {
				for (let x = 0; x < cols; x++) {
					const value = rand(0, 0.2)
					bgCtx.fillStyle = `rgba(255, 255, 255, ${value})`
					bgCtx.beginPath()
					bgCtx.arc(x * cellSize + rand(-5, 5), y * cellSize + rand(-5, 5), rand(1, 3), 0, Math.PI * 2)
					bgCtx.fill()
				}
			}
		}

		// Audio response functions
		function handleBeat(beat: any) {
			// Calculate time since last beat
			const beatInterval = beat.start - lastBeatTime
			lastBeatTime = beat.start

			// Make creatures pulse with the beat
			const beatIntensity = beat.perceivedLoudness * 2

			// Different creature types respond to different beat strengths
			let activeType = Math.floor(harmonicBalance * 3)

			for (const creature of creatures) {
				// Creatures of the active type have a higher chance to pulse
				const shouldPulse = creature.type === activeType ? Math.random() < 0.7 : Math.random() < 0.3

				if (shouldPulse) {
					if (creature.pulse(beatIntensity)) {
						// Emit particles on pulse
						particleSystem.emit(creature.x, creature.y, Math.floor(beatIntensity * 10), beatIntensity, palette.particle(), rand(10, 30))
					}
				}
			}

			// Change movement patterns based on beat intensity
			systemEnergy = clamp(beatIntensity, 0.2, 1.5)
		}

		function handleSection(section: any) {
			// Extract musical key information
			if (section.keys && section.keys.length >= 24) {
				keySignature = Array.from(section.keys)

				// Calculate which creature type should be dominant based on key
				let majorSum = 0
				let minorSum = 0

				// First 12 are major keys, next 12 are minor
				for (let i = 0; i < 12; i++) {
					majorSum += section.keys[i]
				}
				for (let i = 12; i < 24; i++) {
					minorSum += section.keys[i]
				}

				harmonicBalance = majorSum / (majorSum + minorSum)
			}

			// Growth and evolution based on section energy
			const sectionEnergy = section.perceivedLoudness.avg
			growthFactor = sectionEnergy

			// Make plants grow with new sections
			for (const plant of plants) {
				plant.grow(sectionEnergy * 0.01)
			}

			// Possibly spawn new entities
			if (Math.random() < sectionEnergy * 0.5) {
				if (creatures.length < 30 && Math.random() < 0.7) {
					const newType = Math.floor(harmonicBalance * 3)
					creatures.push(new Creature(newType))
				} else if (plants.length < 30) {
					plants.push(new Plant())
				}
			}
		}

		function handleSegment(segment: any) {
			// Respond to sound texture/timbre
			const highEnergyRatio = segment.highEnergy / (segment.lowEnergy + segment.midEnergy + segment.highEnergy)

			// Create particles based on high frequency content
			if (highEnergyRatio > 0.4 && Math.random() < highEnergyRatio) {
				const x = rand(0, 1)
				const y = rand(0, 1)
				particleSystem.emit(x, y, Math.floor(segment.rmsEnergy * 10), segment.rmsEnergy, palette.particle(), rand(5, 15))
			}
		}

		// Main render/update loop
		return (deltaTime, music) => {
			// Clear with a slight alpha for trail effect
			ctx.fillStyle = "rgba(0, 0, 0, 0.1)"
			ctx.fillRect(0, 0, canvas.width, canvas.height)

			// Draw background
			ctx.drawImage(backgroundCanvas, 0, 0)

			// Process audio events
			if (music) {
				if (music.changed.beat && music.beat.current) {
					handleBeat(music.beat.current)
				}

				if (music.changed.section && music.section.current) {
					handleSection(music.section.current)
				}

				if (music.changed.segment && music.segment.current) {
					handleSegment(music.segment.current)
				}
			}

			// Update and draw entities
			// Draw plants first (background)
			for (const plant of plants) {
				plant.update(deltaTime)
				plant.draw()
			}

			// Update and draw creatures
			for (const creature of creatures) {
				creature.update(deltaTime)
				creature.draw()
			}

			// Update and draw particle effects (foreground)
			particleSystem.update(deltaTime)
			particleSystem.draw()

			// Apply decay to system values
			systemEnergy *= Math.pow(decayRate, deltaTime / 100)
		}
	},
})
