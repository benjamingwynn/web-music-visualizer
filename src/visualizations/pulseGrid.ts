import {MusicCanvas} from "../audio/canvas.ts"

MusicCanvas.registerVisualization("pulsegrid", {
	info: {
		name: "PulseGrid",
		author: "chatgpt 4o",
		description: "An evolving grid of pulsing squares reacting to beat and frequency energy with color and motion.",
	},

	does: (canvas) => {
		const ctx = canvas.getContext("2d")
		if (!ctx) throw new Error("Could not create 2D canvas context")

		const gridSize = 10
		const cells: Cell[][] = []
		const baseSize = 1 / gridSize
		const spacing = 0.9

		class Cell {
			x: number
			y: number
			pulse: number = 0
			hueOffset: number = Math.random() * 360

			constructor(x: number, y: number) {
				this.x = x
				this.y = y
			}

			update(energy: number, beatPulse: boolean, beatIndex: number, time: number) {
				const dx = this.x - 0.5
				const dy = this.y - 0.5
				const dist = Math.sqrt(dx * dx + dy * dy)

				const phase = time * 0.5 + dist * 10

				// Add oscillation based on time and position
				const osc = Math.sin(phase) * 0.5 + 0.5

				// On beat, amplify pulse if near center
				if (beatPulse) {
					const influence = Math.exp(-dist * 8)
					this.pulse += energy * influence
				}

				// Decay
				this.pulse *= 0.9

				// Bound pulse
				if (this.pulse > 1) this.pulse = 1

				// Color evolves with pulse and position
				this.hueOffset += 0.5 + this.pulse * 2
			}

			draw() {
				const drawX = this.x * canvas.width
				const drawY = this.y * canvas.height
				const sizeFactor = baseSize * (1 + this.pulse * 0.8) * spacing
				const w = sizeFactor * canvas.width
				const h = sizeFactor * canvas.height

				const hue = (this.hueOffset + this.pulse * 80) % 360
				const lightness = 40 + this.pulse * 30

				ctx.fillStyle = `hsl(${hue}, 80%, ${lightness}%)`
				ctx.fillRect(drawX + (baseSize * canvas.width - w) / 2, drawY + (baseSize * canvas.height - h) / 2, w, h)
			}
		}

		// Initialize cells
		for (let row = 0; row < gridSize; row++) {
			const line: Cell[] = []
			for (let col = 0; col < gridSize; col++) {
				line.push(new Cell(col / gridSize, row / gridSize))
			}
			cells.push(line)
		}

		let lastTime = 0

		return (deltaTime: number, music) => {
			const now = lastTime + deltaTime
			lastTime = now

			ctx.fillStyle = "rgba(0, 0, 0, 0.2)"
			ctx.fillRect(0, 0, canvas.width, canvas.height) // trailing glow effect

			let beatPulse = false
			let energy = 0.5
			let beatIndex = 0

			if (music && music.segment.current) {
				const seg = music.segment.current
				energy = (seg.lowEnergy + seg.midEnergy + seg.highEnergy) / 3
			}

			if (music?.changed.beat && music.beat.current) {
				beatPulse = true
				beatIndex = music.beat.current.index
			}

			for (const row of cells) {
				for (const cell of row) {
					cell.update(energy, beatPulse, beatIndex, now)
					cell.draw()
				}
			}
		}
	},
})
