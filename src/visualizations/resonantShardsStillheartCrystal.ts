import {MusicCanvas} from "../audio/canvas.ts" // Assuming this path is correct
import type {AudioTrackerContext} from "../audio/tracker.ts"

MusicCanvas.registerVisualization("resonantShardsStillheartCrystal", {
	info: {
		name: "Resonant Shards & Stillheart Crystal",
		author: "Gemini AI 2.5 Pro",
		description:
			"Energetic shards burst forth in loud sections. In quiet sections (section.perceivedLoudness.avg < 0.4), a central crystal grows and pulsates, shattering when loudness returns.",
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

		let isQuietMode = false
		const quietThreshold = 0.4
		const shards: ResonantShard[] = []
		let stillheartCrystal: StillheartCrystal | null = null
		let timeSinceSmash = 0

		// --- Resonant Shard Class (for loud parts) ---
		class ResonantShard {
			x: number
			y: number
			vx: number
			vy: number
			size: number
			angle: number
			rotationSpeed: number
			color: string
			opacity: number = 1
			lifespan: number = rand(10_000, 30_000) // ms
			age: number = 0

			constructor(startX: number, startY: number, initialSpeed: number, music: AudioTrackerContext) {
				this.x = startX
				this.y = startY
				const launchAngle = rand(0, Math.PI * 2)
				this.vx = Math.cos(launchAngle) * initialSpeed * 0.0002 * rand(0.5, 1.5)
				this.vy = Math.sin(launchAngle) * initialSpeed * 0.0002 * rand(0.5, 1.5)
				this.size = rand(0.01, 0.04) * (1 + (music.beat.current?.perceivedLoudness || 0.5))
				this.angle = rand(0, Math.PI * 2)
				this.rotationSpeed = rand(-0.05, 0.05) * randSign()

				const segment = music.segment.current
				let r = 150,
					g = 150,
					b = 150
				if (segment) {
					r = 150 + Math.floor(segment.highEnergy * 105)
					g = 100 + Math.floor(segment.midEnergy * 155)
					b = 200 - Math.floor(segment.lowEnergy * 100)
				}
				this.color = `rgb(${Math.min(255, r)}, ${Math.min(255, g)}, ${Math.min(255, b)})`
			}

			update(dT: number) {
				this.x += this.vx * dT
				this.y += this.vy * dT
				this.angle += this.rotationSpeed * (dT / 16)
				this.age += dT
				this.opacity = 1 - this.age / this.lifespan
				this.size *= 0.99 // Shrink slightly
			}

			draw() {
				if (this.opacity <= 0 || this.size <= 0.001) return
				const xPx = this.x * canvas.width
				const yPx = this.y * canvas.height
				const sizePx = this.size * Math.min(canvas.width, canvas.height)

				ctx.save()
				ctx.translate(xPx, yPx)
				ctx.rotate(this.angle)
				ctx.fillStyle = this.color
				ctx.globalAlpha = this.opacity
				// Draw a simple triangle shard
				ctx.beginPath()
				ctx.moveTo(0, -sizePx)
				ctx.lineTo(sizePx * 0.866, sizePx * 0.5)
				ctx.lineTo(-sizePx * 0.866, sizePx * 0.5)
				ctx.closePath()
				ctx.fill()
				ctx.restore()
				ctx.globalAlpha = 1
			}
		}

		// --- Stillheart Crystal Class (for quiet parts) ---
		class StillheartCrystal {
			x = 0.5 * canvas.width
			y = 0.5 * canvas.height
			baseRadius = 0.02 * Math.min(canvas.width, canvas.height)
			currentRadius: number
			maxRadius = 0.2 * Math.min(canvas.width, canvas.height)
			numVertices: number = 6
			vertices: {x: number; y: number}[] = []
			targetVertices: {x: number; y: number}[] = []
			rotation: number = 0
			pulseMagnitude: number = 0
			glowAlpha: number = 0.1
			growthFactor: number = 0 // 0 to 1, how much it has grown towards maxRadius
			isShattering: boolean = false
			shatterParticles: {x: number; y: number; vx: number; vy: number; size: number; opacity: number; color: string}[] = []

			constructor() {
				this.currentRadius = this.baseRadius
				this.generateVertices()
			}

			generateVertices() {
				this.vertices = []
				this.targetVertices = []
				const angleStep = (Math.PI * 2) / this.numVertices
				for (let i = 0; i < this.numVertices; i++) {
					const r = this.currentRadius * rand(0.8, 1.2) // slight irregularity
					const angle = i * angleStep
					this.vertices.push({x: Math.cos(angle) * r, y: Math.sin(angle) * r})
					this.targetVertices.push({x: Math.cos(angle) * r, y: Math.sin(angle) * r}) // initially same
				}
			}

			update(dT: number, music: AudioTrackerContext | undefined) {
				if (this.isShattering) {
					this.updateShatter(dT)
					return
				}

				// Slow growth
				if (this.currentRadius < this.maxRadius) {
					this.growthFactor = Math.min(1, this.growthFactor + dT * 0.00005) // very slow growth factor
					this.currentRadius = this.baseRadius + (this.maxRadius - this.baseRadius) * this.growthFactor
				}
				this.rotation += 0.0001 * dT
				this.pulseMagnitude *= Math.pow(0.95, dT / 16) // Decay pulse

				if (music && music.changed.tatum && music.tatum.current) {
					this.pulseMagnitude = (0.05 + music.tatum.current.confidence * 0.15) * this.currentRadius
					this.glowAlpha = Math.min(0.8, 0.2 + music.tatum.current.confidence * 0.6)

					// Jitter vertices slightly on tatum
					for (let i = 0; i < this.numVertices; i++) {
						const angle = (i * (Math.PI * 2)) / this.numVertices
						const r = this.currentRadius * rand(0.9, 1.1)
						this.targetVertices[i] = {x: Math.cos(angle) * r, y: Math.sin(angle) * r}
					}
				} else {
					this.glowAlpha = Math.max(0.1, this.glowAlpha * Math.pow(0.97, dT / 16)) // Decay glow
				}

				// Smoothly move vertices to target positions
				for (let i = 0; i < this.numVertices; i++) {
					this.vertices[i].x += (this.targetVertices[i].x - this.vertices[i].x) * 0.1
					this.vertices[i].y += (this.targetVertices[i].y - this.vertices[i].y) * 0.1
				}

				if (music && music.changed.beat && music.beat.current && music.beat.current.perceivedLoudness > 0.1) {
					// Soft beat in quiet mode: add a facet or grow a bit faster
					this.pulseMagnitude = (0.1 + music.beat.current.perceivedLoudness * 0.2) * this.currentRadius
					if (this.numVertices < 12 && Math.random() < 0.1) {
						// Max 12 vertices
						this.numVertices++
					}
					this.generateVertices() // regenerate with new radius/vertices
				}
			}

			draw() {
				if (this.isShattering) {
					this.drawShatter()
					return
				}
				ctx.save()
				ctx.translate(this.x, this.y)
				ctx.rotate(this.rotation)

				const effectiveRadius = this.currentRadius + this.pulseMagnitude

				// Draw Glow
				const grad = ctx.createRadialGradient(0, 0, effectiveRadius * 0.5, 0, 0, effectiveRadius * 2)
				grad.addColorStop(0, `rgba(180, 220, 255, ${this.glowAlpha * 0.8})`)
				grad.addColorStop(0.5, `rgba(150, 200, 255, ${this.glowAlpha * 0.4})`)
				grad.addColorStop(1, `rgba(100, 150, 255, 0)`)
				ctx.fillStyle = grad
				ctx.beginPath()
				ctx.arc(0, 0, effectiveRadius * 2.5, 0, Math.PI * 2)
				ctx.fill()

				// Draw Crystal Facets
				ctx.strokeStyle = "rgba(220, 240, 255, 0.7)"
				ctx.fillStyle = "rgba(200, 230, 255, 0.3)"
				ctx.lineWidth = 1.5

				ctx.beginPath()
				if (this.vertices.length > 0) {
					ctx.moveTo(this.vertices[0].x * (effectiveRadius / this.currentRadius), this.vertices[0].y * (effectiveRadius / this.currentRadius))
					for (let i = 1; i < this.numVertices; i++) {
						ctx.lineTo(this.vertices[i].x * (effectiveRadius / this.currentRadius), this.vertices[i].y * (effectiveRadius / this.currentRadius))
					}
				}
				ctx.closePath()
				ctx.stroke()
				ctx.fill()

				ctx.restore()
			}

			shatter() {
				this.isShattering = true
				this.shatterParticles = []
				timeSinceSmash = Date.now()
				const effectiveRadius = this.currentRadius + this.pulseMagnitude
				for (const v of this.vertices) {
					const numFragments = rand(2, 4)
					for (let i = 0; i < numFragments; i++) {
						const size = rand(effectiveRadius * 0.05, effectiveRadius * 0.2)
						const angleToCenter = Math.atan2(v.y, v.x)
						const speed = rand(0.0001, 0.0005) * effectiveRadius
						this.shatterParticles.push({
							x: this.x + v.x * (effectiveRadius / this.currentRadius),
							y: this.y + v.y * (effectiveRadius / this.currentRadius),
							vx: Math.cos(angleToCenter + rand(-0.5, 0.5)) * speed,
							vy: Math.sin(angleToCenter + rand(-0.5, 0.5)) * speed,
							size: size,
							opacity: rand(0.7, 1),
							color: `rgba(200, 230, 255, ${rand(0.5, 1)})`,
						})
					}
				}
			}
			updateShatter(dT: number) {
				for (let i = this.shatterParticles.length - 1; i >= 0; i--) {
					const p = this.shatterParticles[i]
					p.x += p.vx * dT
					p.y += p.vy * dT
					p.opacity -= 0.001 * dT
					p.size *= Math.pow(0.99, dT / 16)
					if (p.opacity <= 0 || p.size <= 0.1) this.shatterParticles.splice(i, 1)
				}
				if (this.shatterParticles.length === 0) {
					stillheartCrystal = null // Fully shattered and gone
					timeSinceSmash = Date.now()
				}
			}
			drawShatter() {
				for (const p of this.shatterParticles) {
					ctx.fillStyle = p.color
					ctx.globalAlpha = p.opacity
					ctx.beginPath()
					ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
					ctx.fill()
				}
				ctx.globalAlpha = 1
			}
		}

		// --- Main Animation Loop ---
		return (deltaTime, music) => {
			ctx.clearRect(0, 0, canvas.width, canvas.height) // Clear canvas each frame

			let currentSectionLoudness = 0.5 // Default if no music
			if (music && music.section.current) {
				currentSectionLoudness = music.section.current.perceivedLoudness.avg
			}

			const newQuietMode = currentSectionLoudness < quietThreshold

			// make a new crystal 3 seconds after smashing one
			if (!stillheartCrystal && Date.now() > timeSinceSmash + 3_000) {
				stillheartCrystal = new StillheartCrystal()
			}

			// Mode transition
			if (newQuietMode && !isQuietMode) {
				// Transition to Quiet Mode
				isQuietMode = true
				if (!stillheartCrystal || stillheartCrystal.isShattering) {
					// only create new if none or old one is gone
					stillheartCrystal = new StillheartCrystal()
				}
				shards.forEach((s) => (s.lifespan = Math.min(s.lifespan, 200))) // Make existing shards fade fast
			} else if (!newQuietMode && isQuietMode) {
				// Transition to Loud Mode
				isQuietMode = false
				if (stillheartCrystal && !stillheartCrystal.isShattering) {
					stillheartCrystal.shatter()
				}
			}

			// Update and Draw based on mode
			if (isQuietMode) {
				if (stillheartCrystal) {
					stillheartCrystal.update(deltaTime, music)
					stillheartCrystal.draw()
				}
			} else {
				// Loud Mode
				if (stillheartCrystal && stillheartCrystal.isShattering) {
					// if crystal is shattering during loud mode start
					stillheartCrystal.update(deltaTime, music) // continue shatter animation
					if (stillheartCrystal) stillheartCrystal.draw()
				} else {
					stillheartCrystal = null // ensure it's gone if not shattering
				}

				if (music && music.changed.beat && music.beat.current) {
					const numToSpawn = Math.floor(rand(3, 7) * (1 + music.beat.current.perceivedLoudness))
					const beatLoudness = music.beat.current.perceivedLoudness
					for (let i = 0; i < numToSpawn; i++) {
						shards.push(new ResonantShard(canvas.width / 2, canvas.height / 2, 1 + beatLoudness * 2, music))
					}
				}
			}

			// Update and draw shards (they can exist briefly in quiet mode as they fade)
			for (let i = shards.length - 1; i >= 0; i--) {
				shards[i].update(deltaTime)
				shards[i].draw()
				if (shards[i].opacity <= 0 || shards[i].age >= shards[i].lifespan) {
					shards.splice(i, 1)
				}
			}
		}
	},
})
