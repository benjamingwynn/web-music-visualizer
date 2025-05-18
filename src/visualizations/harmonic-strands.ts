import {MusicCanvas} from "../audio/canvas.ts" // Assuming this path is correct
import type {AudioTrackerContext} from "../audio/tracker.ts"

MusicCanvas.registerVisualization("harmonicStrands", {
	info: {
		name: "Harmonic Strands",
		author: "Gemini AI 2.5 Pro",
		description:
			"Elegant strands of light, representing different frequency bands, flow and undulate across the screen, their properties dynamically driven by the music.",
	},
	does: (canvas) => {
		const ctx = canvas.getContext("2d")
		if (!ctx) throw new Error("Could not create 2D canvas context")

		function rand(min: number, max: number): number {
			return Math.random() * (max - min) + min
		}

		const MAX_POINTS_PER_STRAND = 150 // Max length of a strand tail
		const POINT_GENERATION_INTERVAL = 30 // ms, how often to add a new point

		class StrandPoint {
			x: number
			y: number
			thickness: number
			alpha: number
			age: number = 0
			constructor(x: number, y: number, thickness: number, alpha: number) {
				this.x = x
				this.y = y
				this.thickness = thickness
				this.alpha = alpha
			}
		}

		class HarmonicStrand {
			points: StrandPoint[] = []
			baseY: number
			color: {r: number; g: number; b: number}
			energyType: "low" | "mid" | "high" | "rms"
			timeSinceLastPoint: number = 0
			waveAmplitude: number = 0.05 // Max vertical deviation from baseY (percentage of canvas height)
			waveFrequency: number = 0.02 // How fast it undulates as it moves horizontally
			currentBaseThickness: number = 2
			currentAlpha: number = 0.8
			horizontalSpeed: number = 0.0001 // Base speed (percentage of canvas width per ms)

			constructor(baseY: number, color: {r: number; g: number; b: number}, energyType: "low" | "mid" | "high" | "rms") {
				this.baseY = baseY
				this.color = color
				this.energyType = energyType
			}

			update(dT: number, music: AudioTrackerContext | undefined) {
				this.timeSinceLastPoint += dT

				let energyValue = 0.1 // Default minimum energy
				let beatPulse = 0
				let sectionLoudness = 0.3
				let tatumConfidence = 0

				if (music && music.segment.current) {
					switch (this.energyType) {
						case "low":
							energyValue = music.segment.current.lowEnergy
							break
						case "mid":
							energyValue = music.segment.current.midEnergy
							break
						case "high":
							energyValue = music.segment.current.highEnergy
							break
						case "rms":
							energyValue = music.segment.current.rmsEnergy
							break
					}
				}
				if (music && music.changed.beat && music.beat.current) {
					beatPulse = music.beat.current.perceivedLoudness * 0.5 // How much beat affects thickness/alpha
				}
				if (music && music.section.current) {
					sectionLoudness = music.section.current.perceivedLoudness.avg
				}
				if (music && music.tatum.current) {
					tatumConfidence = music.tatum.current.confidence
				}

				// Update strand properties based on music
				this.currentBaseThickness = 2 + energyValue * 15 + beatPulse * 10
				this.currentAlpha = Math.min(1, 0.3 + energyValue * 0.7 + beatPulse * 0.5 + sectionLoudness * 0.3)
				this.horizontalSpeed = 0.00005 + energyValue * 0.0002 + ((music?.section.current?.bpm.avg || 120) / 120) * 0.00005
				const dynamicWaveAmplitude = this.waveAmplitude * (1 + energyValue * 2)

				// Add new point if interval passed
				if (this.timeSinceLastPoint >= POINT_GENERATION_INTERVAL) {
					this.timeSinceLastPoint = 0

					const newX = 0 // Start from left edge
					// Undulate y position based on x (simulating time) and energy
					const yOffset = Math.sin(this.points.length * this.waveFrequency * (1 + energyValue)) * dynamicWaveAmplitude * canvas.height
					const newY = this.baseY * canvas.height + yOffset + tatumConfidence * rand(-5, 5) // Tatum adds slight jitter

					this.points.unshift(new StrandPoint(newX, newY, this.currentBaseThickness, this.currentAlpha))
				}

				// Move and fade existing points
				for (let i = this.points.length - 1; i >= 0; i--) {
					const point = this.points[i]
					point.x += this.horizontalSpeed * canvas.width * dT
					point.age += dT
					point.alpha *= 0.995 // Gradual fade
					point.thickness *= 0.99 // Gradual thinning

					// Remove points that are off-screen or too faint/thin
					if (point.x > canvas.width || point.alpha < 0.01 || point.thickness < 0.5) {
						this.points.splice(i, 1)
					}
				}

				// Limit total points
				while (this.points.length > MAX_POINTS_PER_STRAND) {
					this.points.pop()
				}
			}

			draw() {
				if (this.points.length < 2) return

				ctx.beginPath()
				ctx.moveTo(this.points[0].x, this.points[0].y)

				for (let i = 1; i < this.points.length; i++) {
					const p1 = this.points[i - 1]
					const p2 = this.points[i]
					// Using quadratic curve for smoother connection.
					// The control point could be the midpoint of the current and previous point,
					// or just use lineTo for simplicity if performance is an issue.
					const xc = (p1.x + p2.x) / 2
					const yc = (p1.y + p2.y) / 2
					ctx.quadraticCurveTo(p1.x, p1.y, xc, yc)
					// For drawing with varying thickness per segment, we'd need a different approach:
					// Draw each segment p1-p2 individually with its own lineStyle.
					// This is a simplified approach where the whole line gets one style (from the latest point)
					// A more advanced method would be to draw segment by segment.
				}
				// This simplified draw uses the latest point's properties for the whole curve for performance.
				// For per-segment properties, a loop of beginPath/stroke for each segment is needed.
				ctx.lineWidth = this.points[0].thickness
				ctx.strokeStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.points[0].alpha})`
				ctx.lineCap = "round"
				ctx.lineJoin = "round"
				ctx.stroke()

				// Alternative: Per-segment drawing (more accurate, potentially slower)
				/*
                for (let i = 0; i < this.points.length - 1; i++) {
                    const p1 = this.points[i];
                    const p2 = this.points[i+1];
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.lineWidth = p1.thickness; // Use the starting point's thickness for the segment
                    ctx.strokeStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${p1.alpha})`;
                    ctx.lineCap = "round";
                    ctx.stroke();
                }
                */
			}
		}

		const strands = [
			new HarmonicStrand(0.25, {r: 255, g: 100, b: 100}, "high"), // Treble - Reddish
			new HarmonicStrand(0.5, {r: 100, g: 255, b: 100}, "mid"), // Mid - Greenish
			new HarmonicStrand(0.75, {r: 100, g: 100, b: 255}, "low"), // Bass - Bluish
		]

		// Store last clear time to manage background fade
		let lastBackgroundFadeTime = 0
		const backgroundFadeInterval = 50 // ms, fade slightly every 50ms
		const backgroundAlpha = 0.1 // How much to fade the background each time

		return (deltaTime, music) => {
			// Background effect: slight fade over time instead of clearRect for trails
			lastBackgroundFadeTime += deltaTime
			if (lastBackgroundFadeTime >= backgroundFadeInterval) {
				ctx.fillStyle = `rgba(0, 0, 0, ${backgroundAlpha})` // Adjust alpha for desired trail length
				ctx.fillRect(0, 0, canvas.width, canvas.height)
				lastBackgroundFadeTime = 0
			}
			if (music && music.changed.section) {
				// Full clear on section change for a fresh look
				ctx.clearRect(0, 0, canvas.width, canvas.height)
			}

			for (const strand of strands) {
				strand.update(deltaTime, music)
				// For the per-segment drawing, it's better to draw here.
				// If using the simplified curve, that's also fine.
				// I'll use the per-segment drawing method for better visual accuracy of fading tails.
				if (strand.points.length < 2) continue
				for (let i = 0; i < strand.points.length - 1; i++) {
					const p1 = strand.points[i]
					const p2 = strand.points[i + 1]
					ctx.beginPath()
					ctx.moveTo(p1.x, p1.y)
					ctx.lineTo(p2.x, p2.y) // Simple lineTo is fine for many points
					ctx.lineWidth = p1.thickness
					ctx.strokeStyle = `rgba(${strand.color.r}, ${strand.color.g}, ${strand.color.b}, ${p1.alpha})`
					ctx.lineCap = "round"
					ctx.stroke()
				}
			}
		}
	},
})
