import {MusicCanvas} from "api"

MusicCanvas.registerVisualization("vortex", {
	info: {
		name: "Quantum Vortex (Smooth)",
		author: "Gemini 3 Pro + Flash",
		description: "A fluid, cinematic vortex with heavy temporal smoothing for a liquid-motion effect.",
		rating: 4,
	},
	does: (canvas) => {
		const ctx = canvas.getContext("2d")
		if (!ctx) throw new Error("Could not create 2D canvas context")

		// --- Helper Functions ---
		function rand(min: number, max: number): number {
			return Math.random() * (max - min) + min
		}

		// Global smoothing variables to buffer the "raw" audio jitters
		let smoothLow = 0
		let smoothMid = 0
		let smoothHigh = 0
		let smoothBeat = 0

		class VortexParticle {
			angle: number
			distance: number
			baseDistance: number
			baseSize: number
			currentSize: number
			speed: number
			hueOffset: number

			// Internal smoothed properties for this specific particle
			renderDistance: number
			renderSize: number
			renderAlpha: number

			constructor(maxDist: number) {
				this.angle = rand(0, Math.PI * 2)
				this.baseDistance = rand(20, maxDist)
				this.distance = this.baseDistance
				this.renderDistance = this.distance
				this.baseSize = rand(0.5, 2.0)
				this.currentSize = this.baseSize
				this.renderSize = this.baseSize
				this.renderAlpha = 0.1
				// Slowed down the base rotation significantly
				this.speed = rand(0.00002, 0.0004)
				this.hueOffset = rand(-20, 20)
			}

			update(dt: number, cx: number, cy: number) {
				// 1. Smooth Rotation: Use the globally smoothed high energy
				const rotationSpeed = this.speed * (1 + smoothHigh * 3)
				this.angle += rotationSpeed * dt

				// 2. Smooth Expansion: Low energy & Beats
				const targetDist = this.baseDistance * (1 + smoothLow * 0.8) + smoothBeat * 50
				// Very low lerp (0.02) makes it feel like it's floating in oil
				this.renderDistance += (targetDist - this.renderDistance) * 0.02

				// 3. Smooth Size: Mid energy
				const targetSize = this.baseSize * (1 + smoothMid * 2.5)
				this.renderSize += (targetSize - this.renderSize) * 0.03

				// 4. Smooth Alpha: Fade based on energy
				const targetAlpha = 0.15 + smoothMid * 0.6
				this.renderAlpha += (targetAlpha - this.renderAlpha) * 0.05

				const x = cx + Math.cos(this.angle) * this.renderDistance
				const y = cy + Math.sin(this.angle) * this.renderDistance

				return {x, y, size: this.renderSize, alpha: this.renderAlpha}
			}
		}

		let particles: VortexParticle[] = []
		let baseHue = 200

		return (dt, music) => {
			const cx = canvas.width / 2
			const cy = canvas.height / 2

			// Initialization
			if (particles.length === 0) {
				const maxDist = Math.min(cx, cy) * 0.9
				for (let i = 0; i < 350; i++) {
					particles.push(new VortexParticle(maxDist))
				}
			}

			// --- GLOBAL SMOOTHING ---
			// We process the music data ONCE per frame here instead of per-particle
			if (music && music.segment.current) {
				const seg = music.segment.current
				// These lerp factors (0.05 - 0.1) filter out the "jitter"
				// of the raw frequency data before it hits the particles.
				smoothLow += (seg.lowEnergy - smoothLow) * 0.08
				smoothMid += (seg.midEnergy - smoothMid) * 0.08
				smoothHigh += (seg.highEnergy - smoothHigh) * 0.05
			}

			if (music && music.changed.beat) {
				smoothBeat = 1.0 // Instant spike on beat
			}
			smoothBeat *= 0.92 // Smooth decay

			// --- DRAWING ---
			// Increase the "trail" effect by lowering the alpha of the clear rect
			ctx.fillStyle = "rgba(0, 0, 0, 0.12)"
			ctx.fillRect(0, 0, canvas.width, canvas.height)

			// Drift the color slowly
			baseHue = (baseHue + dt * 0.002) % 360

			for (const p of particles) {
				const {x, y, size, alpha} = p.update(dt, cx, cy)
				const hue = (baseHue + p.hueOffset) % 360

				ctx.fillStyle = `hsla(${hue}, 70%, 60%, ${alpha})`
				ctx.beginPath()
				// Using a slightly larger arc or even a blur would help,
				// but standard arcs are fine with these smooth coords.
				ctx.arc(x, y, size, 0, Math.PI * 2)
				ctx.fill()
			}
		}
	},
})
