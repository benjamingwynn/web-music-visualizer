import {MusicCanvas} from "../audio/canvas.ts"

MusicCanvas.registerVisualization("chromatic-cascade", {
	info: {
		name: "Chromatic Cascade",
		author: "Gemini",
		description:
			"A vibrant waterfall of colors flows down the screen, reacting to the music's beat, pitch, and intensity. Each musical element influences the color, size, and speed of the cascading streams, creating a dynamic and mesmerizing display.",
	},
	does: (canvas) => {
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

		// Configuration
		const numStreams = 40 // Number of color streams
		const streamWidth = 0.02 // Width of each stream as a fraction of canvas width
		const minStreamHeight = 0.1 // Minimum stream height as a fraction of canvas height
		const maxStreamHeight = 0.4 // Maximum stream height
		const streamSpeedBase = 0.05 // Base speed of the streams
		const streamSpeedVariance = 0.02 // Variance in stream speed
		const gravity = 0.0001 // Acceleration due to "gravity"

		// Stream data structure
		class Stream {
			x: number
			y: number
			height: number
			speedY: number
			colorHue: number
			alpha: number

			constructor(x: number) {
				this.x = x
				this.y = 0
				this.height = rand(minStreamHeight, maxStreamHeight)
				this.speedY = streamSpeedBase + rand(-streamSpeedVariance, streamSpeedVariance)
				this.colorHue = rand(0, 360)
				this.alpha = 1
			}

			tick(deltaTime: number) {
				this.y += this.speedY * deltaTime
				this.speedY += gravity * deltaTime // Simulate gravity

				// Reset stream when it goes off-screen
				if (this.y > 1) {
					this.y = -this.height
					this.height = rand(minStreamHeight, maxStreamHeight)
					this.speedY = streamSpeedBase + rand(-streamSpeedVariance, streamSpeedVariance)
					this.colorHue = rand(0, 360) // Change color on reset
					this.alpha = 1 // Reset alpha
				}

				// Fade out streams as they move
				this.alpha = clamp(1 - this.y / (1 + this.height), 0, 1)
			}

			draw(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
				ctx.fillStyle = `hsla(${this.colorHue}, 100%, 50%, ${this.alpha})`
				ctx.fillRect(this.x * canvasWidth, this.y * canvasHeight, streamWidth * canvasWidth, this.height * canvasHeight)
			}
		}

		const streams = Array.from({length: numStreams}, (_, i) => new Stream(i / numStreams))

		return (deltaTime, music) => {
			ctx.clearRect(0, 0, canvas.width, canvas.height)

			if (music) {
				// React to beats
				if (music.changed.beat && music.beat.current) {
					const beatLoudness = music.beat.current.perceivedLoudness
					// Increase stream speed on beats, more for louder beats
					for (const stream of streams) {
						stream.speedY += beatLoudness * 0.02
					}
				}

				// React to segments (short musical events)
				if (music.segment.current) {
					const segment = music.segment.current
					// Adjust hue based on segment energy
					const energy = (segment.lowEnergy + segment.midEnergy + segment.highEnergy) / 3
					for (const stream of streams) {
						stream.colorHue = (stream.colorHue + energy * 10) % 360
					}
				}

				// React to sections (larger musical parts like verse, chorus)
				if (music.changed.section && music.section.current) {
					const sectionLoudness = music.section.current.perceivedLoudness.avg
					// Adjust stream height based on section loudness
					for (const stream of streams) {
						stream.height = lerp(minStreamHeight, maxStreamHeight, sectionLoudness)
					}
					// Change base color based on musical key
					const keys = music.section.current.keys
					let strongestKeyIndex = 0
					let strongestKeyConfidence = 0
					for (let i = 0; i < 12; i++) {
						if (keys[i] > strongestKeyConfidence) {
							strongestKeyConfidence = keys[i]
							strongestKeyIndex = i
						}
					}
					// Map key index to a base hue (0-360)
					const baseHue = (strongestKeyIndex / 12) * 360
					for (const stream of streams) {
						stream.colorHue = (baseHue + rand(-30, 30)) % 360 // Vary hues slightly
					}
				}
			}

			// Update and draw streams
			for (const stream of streams) {
				stream.tick(deltaTime)
				stream.draw(ctx, canvas.width, canvas.height)
			}
		}
	},
})
