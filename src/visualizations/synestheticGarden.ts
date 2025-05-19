import {MusicCanvas} from "../audio/canvas.ts"

MusicCanvas.registerVisualization("synesthetic-garden", {
	info: {
		name: "Synesthetic Garden",
		author: "ChatGPT 4o",
		description: "A blooming audiovisual garden where music makes flowers grow and ripple in sync with sound energy.",
	},

	does: (canvas) => {
		const ctx = canvas.getContext("2d")
		if (!ctx) throw new Error("Could not get canvas context")

		const petalsPerFlower = 6
		const flowers: Flower[] = []

		function rand(min: number, max: number) {
			return Math.random() * (max - min) + min
		}

		class Petal {
			angle: number
			length: number
			width: number
			color: string
			waveOffset: number

			constructor(index: number, baseHue: number) {
				this.angle = ((Math.PI * 2) / petalsPerFlower) * index
				this.length = rand(20, 40)
				this.width = rand(8, 15)
				this.color = `hsl(${baseHue}, 70%, ${rand(50, 80)}%)`
				this.waveOffset = rand(0, Math.PI * 2)
			}

			draw(ctx: CanvasRenderingContext2D, x: number, y: number, pulse: number) {
				const sway = Math.sin(pulse + this.waveOffset) * 5
				const dx = Math.cos(this.angle) * this.length
				const dy = Math.sin(this.angle) * this.length

				ctx.beginPath()
				ctx.ellipse(x + dx / 2 + sway, y + dy / 2 + sway, this.width, this.length, this.angle, 0, Math.PI * 2)
				ctx.fillStyle = this.color
				ctx.fill()
			}
		}

		class Flower {
			x: number
			y: number
			petals: Petal[]
			createdAt: number
			baseHue: number

			constructor() {
				this.x = rand(0.1, 0.9) * canvas.width
				this.y = rand(0.6, 0.95) * canvas.height
				this.baseHue = rand(0, 360)
				this.petals = Array.from({length: petalsPerFlower}, (_, i) => new Petal(i, this.baseHue))
				this.createdAt = performance.now()
			}

			draw(ctx: CanvasRenderingContext2D, pulse: number) {
				for (const petal of this.petals) {
					petal.draw(ctx, this.x, this.y, pulse)
				}
				// Center
				ctx.beginPath()
				ctx.arc(this.x, this.y, 6, 0, Math.PI * 2)
				ctx.fillStyle = `hsl(${this.baseHue}, 80%, 40%)`
				ctx.fill()
			}
		}

		let pulse = 0
		let bpmSmoothed = 0
		let lastSectionIndex = -1

		return (deltaTime: number, music) => {
			ctx.clearRect(0, 0, canvas.width, canvas.height)

			const time = performance.now()

			if (music) {
				// On beat: grow new flowers
				if (music.changed.beat && music.beat.current && music.beat.current.confidence > 0.5) {
					const loudness = music.beat.current.perceivedLoudness
					for (let i = 0; i < Math.floor(loudness * 3); i++) {
						flowers.push(new Flower())
					}
				}

				// On new section: shift hue spectrum
				if (music.changed.section && music.section.current && music.section.current.index !== lastSectionIndex) {
					lastSectionIndex = music.section.current.index
					const shiftHue = rand(60, 120)
					for (const flower of flowers) {
						flower.baseHue = (flower.baseHue + shiftHue) % 360
						flower.petals.forEach((p) => {
							p.color = `hsl(${flower.baseHue}, 70%, ${rand(50, 80)}%)`
						})
					}
				}

				// Smooth pulse based on segment loudness
				if (music.segment.current) {
					pulse += deltaTime * music.segment.current.perceivedLoudness * 0.2
				}

				// Smooth BPM to modulate flower shimmer
				if (music.beat.current) {
					bpmSmoothed = bpmSmoothed * 0.95 + music.beat.current.bpm * 0.05
				}
			}

			// Fade older flowers
			const lifetime = 10000
			while (flowers.length > 100) flowers.shift()
			for (let i = flowers.length - 1; i >= 0; i--) {
				const f = flowers[i]
				const age = time - f.createdAt
				if (age > lifetime) {
					flowers.splice(i, 1)
				}
			}

			// Draw flowers
			for (const flower of flowers) {
				flower.draw(ctx, pulse)
			}
		}
	},
})
