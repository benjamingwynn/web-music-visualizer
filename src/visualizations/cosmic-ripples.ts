import {MusicCanvas} from "../audio/canvas.ts"

MusicCanvas.registerVisualization("cosmic-ripples", {
	info: {
		name: "Cosmic Ripples",
		author: "Claude 3.7 Sonnet",
		description: "A cosmic visualization that creates expanding ripples of color in response to music",
	},
	does: (canvas) => {
		const ctx = canvas.getContext("2d")
		if (!ctx) throw new Error("Could not create 2D canvas context")

		// Helper functions
		function rand(min: number, max: number): number {
			return Math.random() * (max - min) + min
		}

		function hslToHex(h: number, s: number, l: number): string {
			h /= 360
			s /= 100
			l /= 100

			let r, g, b

			if (s === 0) {
				r = g = b = l
			} else {
				const hue2rgb = (p: number, q: number, t: number) => {
					if (t < 0) t += 1
					if (t > 1) t -= 1
					if (t < 1 / 6) return p + (q - p) * 6 * t
					if (t < 1 / 2) return q
					if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
					return p
				}

				const q = l < 0.5 ? l * (1 + s) : l + s - l * s
				const p = 2 * l - q

				r = hue2rgb(p, q, h + 1 / 3)
				g = hue2rgb(p, q, h)
				b = hue2rgb(p, q, h - 1 / 3)
			}

			const toHex = (x: number) => {
				const hex = Math.round(x * 255).toString(16)
				return hex.length === 1 ? "0" + hex : hex
			}

			return `#${toHex(r)}${toHex(g)}${toHex(b)}`
		}

		// Ripple class
		class Ripple {
			x: number
			y: number
			radius: number
			maxRadius: number
			color: string
			lineWidth: number
			speed: number
			opacity: number

			constructor(x: number, y: number, maxRadius: number, color: string, speed: number, lineWidth: number) {
				this.x = x
				this.y = y
				this.radius = 0
				this.maxRadius = maxRadius
				this.color = color
				this.lineWidth = lineWidth
				this.speed = speed
				this.opacity = 1
			}

			update(dT: number) {
				this.radius += this.speed * dT
				this.opacity = Math.max(0, 1 - this.radius / this.maxRadius)
				return this.radius <= this.maxRadius
			}

			draw(ctx: CanvasRenderingContext2D) {
				ctx.beginPath()
				ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
				ctx.strokeStyle = this.color.replace(")", `, ${this.opacity})`)
				ctx.lineWidth = this.lineWidth
				ctx.stroke()
			}
		}

		// Star class for background
		class Star {
			x: number
			y: number
			size: number
			brightness: number
			blinkSpeed: number

			constructor() {
				this.x = Math.random()
				this.y = Math.random()
				this.size = rand(0.001, 0.003)
				this.brightness = rand(0.5, 1)
				this.blinkSpeed = rand(0.001, 0.003)
			}

			update(dT: number, beat?: number) {
				// Star twinkle effect
				this.brightness += Math.sin(Date.now() * this.blinkSpeed) * 0.005

				// Boost brightness on beat
				if (beat) {
					this.brightness += beat * 0.1
				}

				this.brightness = Math.max(0.3, Math.min(1, this.brightness))
			}

			draw(ctx: CanvasRenderingContext2D, width: number, height: number) {
				const x = this.x * width
				const y = this.y * height
				const size = this.size * Math.min(width, height)

				ctx.fillStyle = `rgba(255, 255, 255, ${this.brightness})`
				ctx.beginPath()
				ctx.arc(x, y, size, 0, Math.PI * 2)
				ctx.fill()
			}
		}

		// Setup state
		const stars = Array.from({length: 150}, () => new Star())
		const ripples: Ripple[] = []
		let hueRotation = 0
		let timeSinceLastBeat = 0
		let beatEnergy = 0
		let backgroundAlpha = 0.05
		let totalTime = 0

		// For frequency response effects
		let lowFreqEnergy = 0
		let midFreqEnergy = 0
		let highFreqEnergy = 0

		return (dT, music) => {
			// Update total time
			totalTime += dT

			// Clear with a semi-transparent black for trailing effect
			ctx.fillStyle = `rgba(0, 0, 0, ${backgroundAlpha})`
			ctx.fillRect(0, 0, canvas.width, canvas.height)

			// Update color rotation based on music energy
			if (music && music.segment.current) {
				lowFreqEnergy = music.segment.current.lowEnergy * 0.8 + lowFreqEnergy * 0.2
				midFreqEnergy = music.segment.current.midEnergy * 0.8 + midFreqEnergy * 0.2
				highFreqEnergy = music.segment.current.highEnergy * 0.8 + highFreqEnergy * 0.2

				// Adjust background fade based on overall energy
				const overallEnergy = (lowFreqEnergy + midFreqEnergy + highFreqEnergy) / 3
				backgroundAlpha = 0.05 + overallEnergy * 0.1
			}

			// Rotate hue based on time
			hueRotation = (hueRotation + dT * 10) % 360

			// Create new ripples on beats
			if (music && music.changed.beat && music.beat.current) {
				timeSinceLastBeat = 0

				beatEnergy = music.beat.current.confidence * (music.section.current?.perceivedLoudness.avg || 0.5)

				// Create ripple at center
				const centerX = canvas.width / 2
				const centerY = canvas.height / 2
				const maxRadius = Math.max(canvas.width, canvas.height) * 0.8

				// Use music features to determine ripple properties
				const baseHue = (hueRotation + lowFreqEnergy * 120) % 360
				const saturation = 50 + midFreqEnergy * 50
				const lightness = 30 + highFreqEnergy * 30

				const rippleColor = `hsla(${baseHue}, ${saturation}%, ${lightness}%`
				const rippleSpeed = 50 + beatEnergy * 150
				const lineWidth = 1 + beatEnergy * 4

				ripples.push(new Ripple(centerX, centerY, maxRadius, rippleColor, rippleSpeed, lineWidth))

				// Also create some smaller ripples at random positions
				if (beatEnergy > 0.6) {
					for (let i = 0; i < 3; i++) {
						const x = rand(0.2, 0.8) * canvas.width
						const y = rand(0.2, 0.8) * canvas.height
						const radius = maxRadius * rand(0.2, 0.5)
						const hueOffset = rand(-30, 30)
						const speed = rippleSpeed * rand(0.5, 1.5)

						ripples.push(
							new Ripple(x, y, radius, `hsla(${(baseHue + hueOffset) % 360}, ${saturation}%, ${lightness}%`, speed, lineWidth * rand(0.5, 1))
						)
					}
				}
			}

			// Update stars
			for (const star of stars) {
				star.update(dT, music?.segment.current?.perceivedLoudness || 0)
				star.draw(ctx, canvas.width, canvas.height)
			}

			// Increment time since last beat
			timeSinceLastBeat += dT

			// Update and draw ripples
			for (let i = ripples.length - 1; i >= 0; i--) {
				const active = ripples[i].update(dT)

				if (active) {
					ripples[i].draw(ctx)
				} else {
					ripples.splice(i, 1)
				}
			}

			// Draw cosmic center
			if (music && music.segment.current) {
				const centerX = canvas.width / 2
				const centerY = canvas.height / 2
				const size = Math.min(canvas.width, canvas.height) * (0.05 + music.segment.current.perceivedLoudness * 0.05)

				// Inner glow
				const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, size)

				const centerHue = (hueRotation + 180) % 360
				gradient.addColorStop(0, `hsla(${centerHue}, 100%, 70%, 0.8)`)
				gradient.addColorStop(0.7, `hsla(${centerHue}, 80%, 60%, 0.5)`)
				gradient.addColorStop(1, `hsla(${centerHue}, 60%, 40%, 0)`)

				ctx.fillStyle = gradient
				ctx.beginPath()
				ctx.arc(centerX, centerY, size, 0, Math.PI * 2)
				ctx.fill()
			}
		}
	},
})
