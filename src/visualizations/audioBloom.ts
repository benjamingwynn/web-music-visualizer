import {MusicCanvas} from "../audio/canvas.ts"

MusicCanvas.registerVisualization("audio-bloom-gemini", {
	info: {
		author: "Gemini 2.5 Pro",
		name: "Audio Bloom by Gemini",
		description: "A mystical flower blooms and radiates energy in sync with the music.",
		gpu: undefined, // Using 2D canvas context
	},
	does: (canvas) => {
		const ctx = canvas.getContext("2d")
		let width = canvas.width
		let height = canvas.height

		// Helper function for random numbers
		const random = (min, max) => Math.random() * (max - min) + min

		// Flower properties
		const flower = {
			centerX: width / 2,
			centerY: height / 2,
			baseRadius: 30,
			petalCount: 8,
			petalLength: 100,
			petalWidthFactor: 0.5, // How wide petals are relative to their length
			color: "hsl(180, 70%, 50%)", // Base color
			pulseRadius: 0,
			pulseAlpha: 0,
			coreColor: "hsl(60, 100%, 80%)",
			coreRadius: 15,
		}

		// Particles (dew drops/energy)
		let particles = []
		const MAX_PARTICLES = 200

		// Background properties
		let backgroundHue = 200 // Start with a cool blue

		// Helper function to draw a petal
		function drawPetal(angle, length, currentPetalWidth) {
			ctx.beginPath()
			ctx.moveTo(flower.centerX, flower.centerY)

			const tipX = flower.centerX + Math.cos(angle) * (flower.baseRadius + length)
			const tipY = flower.centerY + Math.sin(angle) * (flower.baseRadius + length)

			const controlAngle1 = angle - (Math.PI / (flower.petalCount * 2)) * currentPetalWidth
			const controlAngle2 = angle + (Math.PI / (flower.petalCount * 2)) * currentPetalWidth

			const cp1x = flower.centerX + Math.cos(controlAngle1) * (flower.baseRadius + length * 0.5)
			const cp1y = flower.centerY + Math.sin(controlAngle1) * (flower.baseRadius + length * 0.5)

			const cp2x = flower.centerX + Math.cos(controlAngle2) * (flower.baseRadius + length * 0.5)
			const cp2y = flower.centerY + Math.sin(controlAngle2) * (flower.baseRadius + length * 0.5)

			ctx.quadraticCurveTo(cp1x, cp1y, tipX, tipY)
			ctx.quadraticCurveTo(cp2x, cp2y, flower.centerX, flower.centerY)

			ctx.closePath()
			ctx.fill()
			ctx.stroke()
		}

		// Resize handler
		const resizeObserver = new ResizeObserver((entries) => {
			for (let entry of entries) {
				width = entry.contentRect.width
				height = entry.contentRect.height
				flower.centerX = width / 2
				flower.centerY = height / 2
			}
		})
		resizeObserver.observe(canvas)

		// Render loop
		return (deltaTime, music) => {
			// Ensure canvas context is available
			if (!ctx) {
				console.error("Canvas context not found for Audio Bloom")
				return
			}

			// Update dimensions (important for responsive canvas)
			if (canvas.width !== width || canvas.height !== height) {
				canvas.width = width
				canvas.height = height
				flower.centerX = width / 2
				flower.centerY = height / 2
			}

			// --- Background ---
			ctx.fillStyle = `hsl(${backgroundHue}, 50%, 10%)`
			ctx.fillRect(0, 0, width, height)

			// --- Music Data Handling ---
			let beatLoudness = 0.5 // Default
			let beatConfidence = 0.5
			let segmentRms = 0.1
			let segmentEnergies = {low: 0.3, mid: 0.3, high: 0.3}
			let tatumConfidence = 0

			if (music) {
				if (music.beat.current) {
					beatLoudness = music.beat.current.perceivedLoudness
					beatConfidence = music.beat.current.confidence
					if (music.changed.beat) {
						flower.pulseRadius = flower.baseRadius * 0.8 * beatLoudness
						flower.pulseAlpha = 1.0 * beatConfidence
					}
				}

				if (music.segment.current) {
					segmentRms = music.segment.current.rmsEnergy
					segmentEnergies = {
						low: music.segment.current.lowEnergy,
						mid: music.segment.current.midEnergy,
						high: music.segment.current.highEnergy,
					}

					// Add particles based on segment energy
					const particlesToSpawn = Math.floor(segmentRms * 10)
					for (let i = 0; i < particlesToSpawn && particles.length < MAX_PARTICLES; i++) {
						const angle = random(0, Math.PI * 2)
						const petalIndex = Math.floor(random(0, flower.petalCount))
						const startAngle = ((Math.PI * 2) / flower.petalCount) * petalIndex

						const energySum = segmentEnergies.low + segmentEnergies.mid + segmentEnergies.high
						let particleHue
						if (energySum > 0) {
							// Weighted hue: low (0-30, red/orange), mid (80-160, green/cyan), high (200-280, blue/purple)
							const lowWeight = segmentEnergies.low / energySum
							const midWeight = segmentEnergies.mid / energySum
							const highWeight = segmentEnergies.high / energySum

							if (segmentEnergies.high > segmentEnergies.mid && segmentEnergies.high > segmentEnergies.low) {
								particleHue = random(200, 280) // Blues/Purples for high energy
							} else if (segmentEnergies.mid > segmentEnergies.low) {
								particleHue = random(80, 160) // Greens/Yellows for mid energy
							} else {
								particleHue = random(0, 60) // Reds/Oranges for low energy
							}
						} else {
							particleHue = random(0, 360)
						}

						particles.push({
							x: flower.centerX + Math.cos(startAngle) * (flower.coreRadius + 5),
							y: flower.centerY + Math.sin(startAngle) * (flower.coreRadius + 5),
							vx: Math.cos(startAngle) * random(0.5, 2 + segmentRms * 3), // Speed influenced by RMS
							vy: Math.sin(startAngle) * random(0.5, 2 + segmentRms * 3),
							size: random(1, 3 + segmentRms * 2),
							alpha: 1.0,
							color: `hsl(${particleHue}, 90%, ${70 + segmentRms * 20}%)`, // Brighter with more RMS
							life: random(50, 150), // Longer life for particles
						})
					}
				}

				if (music.section.current && music.changed.section) {
					const avgBpm = music.section.current.bpm.avg
					// Example: map BPM (e.g., 60-180) to hue (e.g., 180-360 or 0)
					backgroundHue = 180 + (avgBpm / 200) * 180 // Simple mapping
					if (backgroundHue > 360) backgroundHue -= 360

					// Consider key for flower core color
					if (music.section.current.keys && music.section.current.keys.length > 0) {
						let maxKeyConfidence = 0
						let dominantKeyIndex = 0
						music.section.current.keys.forEach((kConf, kIdx) => {
							if (kConf > maxKeyConfidence) {
								maxKeyConfidence = kConf
								dominantKeyIndex = kIdx
							}
						})
						// Map key index (0-23) to hue for the core
						flower.coreColor = `hsl(${(dominantKeyIndex / 24) * 360}, 100%, 70%)`
					}
				}

				if (music.tatum.current && music.changed.tatum) {
					tatumConfidence = music.tatum.current.confidence
				}
			}

			// --- Pulsing effect ---
			if (flower.pulseAlpha > 0) {
				ctx.strokeStyle = `hsla(${(180 + beatConfidence * 60) % 360}, 80%, 60%, ${flower.pulseAlpha})`
				ctx.lineWidth = 3 + beatLoudness * 5
				ctx.beginPath()
				ctx.arc(flower.centerX, flower.centerY, flower.baseRadius + flower.pulseRadius * beatLoudness, 0, Math.PI * 2)
				ctx.stroke()
				flower.pulseRadius *= 0.95 // Dampen
				flower.pulseAlpha *= 0.9 // Fade
			}

			// --- Draw Flower ---
			const currentPetalLength = flower.petalLength + flower.pulseRadius * 0.3 * beatLoudness
			const currentPetalWidthFactor = flower.petalWidthFactor + flower.pulseRadius * 0.002 * beatLoudness

			for (let i = 0; i < flower.petalCount; i++) {
				const angle = ((Math.PI * 2) / flower.petalCount) * i
				const petalHue = (180 + i * (360 / flower.petalCount)) % 360 // Distribute hues
				const petalSaturation = 60 + beatConfidence * 30
				const petalLightness = 40 + beatLoudness * 20

				ctx.fillStyle = `hsl(${petalHue}, ${petalSaturation}%, ${petalLightness}%)`
				ctx.strokeStyle = `hsl(${petalHue}, ${petalSaturation}%, ${petalLightness - 15}%)`
				ctx.lineWidth = 1 + beatLoudness
				drawPetal(angle, currentPetalLength, currentPetalWidthFactor)
			}

			// Draw flower core
			ctx.beginPath()
			ctx.arc(flower.centerX, flower.centerY, flower.coreRadius + flower.pulseRadius * 0.1, 0, Math.PI * 2)
			ctx.fillStyle = flower.coreColor
			ctx.fill()

			// Tatum shimmers (subtle)
			if (tatumConfidence > 0.7) {
				const shimmerCount = Math.floor(random(2, 5))
				for (let i = 0; i < shimmerCount; i++) {
					const petalIndex = Math.floor(random(0, flower.petalCount))
					const angle = ((Math.PI * 2) / flower.petalCount) * petalIndex
					const shimmerX = flower.centerX + Math.cos(angle) * (flower.baseRadius + currentPetalLength - random(5, 15))
					const shimmerY = flower.centerY + Math.sin(angle) * (flower.baseRadius + currentPetalLength - random(5, 15))
					ctx.fillStyle = `hsla(0, 0%, 100%, ${random(0.3, 0.8) * tatumConfidence})`
					ctx.beginPath()
					ctx.arc(shimmerX, shimmerY, random(1, 3), 0, Math.PI * 2)
					ctx.fill()
				}
			}

			// --- Update and Draw Particles ---
			particles = particles.filter((p) => p.alpha > 0 && p.life > 0)
			particles.forEach((p) => {
				p.x += p.vx * deltaTime * 0.1 // Scale velocity by deltaTime
				p.y += p.vy * deltaTime * 0.1
				p.alpha -= 0.01 * (150 / p.life) // Fade faster for shorter lived particles
				p.life -= 1

				// Keep particles somewhat within a larger radius of the flower, or fade them if they go too far
				const distFromCenter = Math.sqrt(Math.pow(p.x - flower.centerX, 2) + Math.pow(p.y - flower.centerY, 2))
				if (distFromCenter > Math.min(width, height) * 0.4) {
					p.alpha *= 0.9 // Fade faster if far
				}

				ctx.beginPath()
				ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
				ctx.fillStyle = p.color.replace(/hsla?\(([^,]+),([^,]+),([^,]+),?\s*([0-9.]+)?\)/, `hsla($1,$2,$3,${p.alpha})`)
				ctx.fill()
			})
		}
	},
})
