MusicCanvas.registerVisualization("growths", {
	info: {
		name: "Doodle Flowers",
		author: "Benjamin Gwynn",
		description: "Doodles of flowers grow with the music. Works well for slow music with synths.",
	},
	does: (canvas) => {
		// do your world setup, canvas setup, etc here
		const ctx = canvas.getContext("2d") as CanvasRenderingContext2D
		if (!ctx) throw new Error("ruh oh")

		const plants = new Set<Growth>()

		const STEM_NOISE = 3
		const STEM_PARTS = 10

		function smallNoise(n: number) {
			return Math.random() * n + (1 - n)
		}

		class Growth {
			private created = performance.now()
			stemPath: number[][]
			lifespan: number
			x: number
			stemParts: number
			hsl: string
			noiseAmount: number
			scaleFactor: number
			spiralAmount: number

			private get age() {
				return performance.now() - this.created
			}

			private get state() {
				if (this.age > this.lifespan) {
					return "dead"
				}
				const per = this.lifespan / 3
				if (this.age > per * 2) {
					return "decay"
				}
				if (this.age > per) {
					return "spiral"
				}

				return "stem"
			}

			private get stemTime() {
				return Math.min(1, this.age / (this.lifespan / 3))
			}

			private get spiralTime() {
				const per = this.lifespan / 3
				return Math.min(1, (this.age - per) / per)
			}

			private get decayTime() {
				const per = this.lifespan / 3
				return Math.max(0, Math.min(1, (this.age - per * 2) / per))
			}

			private get translateTime() {
				return this.age / this.lifespan
			}

			private get opacity() {
				return 1 - this.decayTime
			}

			private get color() {
				return `hsl(${this.hsl} / ${(this.opacity * 100).toFixed(1)}%)`
			}

			constructor(x: number, height: number, lifespan: number, hsl: string, noiseAmount: number, scaleFactor: number, spiralAmount: number) {
				this.lifespan = lifespan
				this.noiseAmount = noiseAmount
				this.x = x
				this.hsl = hsl
				this.scaleFactor = scaleFactor
				this.spiralAmount = spiralAmount
				const STEM_SIZE = canvas.height * height
				this.stemParts = STEM_SIZE / STEM_PARTS
				this.stemPath = Array.from({length: this.stemParts}).map((_, i) => {
					return [canvas.width * x + STEM_NOISE * (Math.random() - 0.5), canvas.height - (i / this.stemParts) * STEM_SIZE]
				})
			}

			drawStem() {
				const time = this.stemTime
				const stems = this.stemPath.slice(0, Math.ceil(time * this.stemParts))
				ctx.beginPath()
				for (const stemPart of stems) {
					const [x, y] = stemPart
					const wiggle = smallNoise(0.006 * this.noiseAmount)
					ctx.lineTo(x * wiggle, y)
				}
			}

			drawSpiral() {
				const startX = this.stemPath.at(-1)[0]
				const startY = this.stemPath.at(-1)[1]

				const maxRadius = canvas.width * 0.1 * this.spiralAmount
				const radiusStep = 0.3
				const angleStep = 0.1
				const time = this.spiralTime

				const maxAngle = maxRadius * Math.PI * time

				let angle = 9.28
				let radius = 0

				while (angle < maxAngle && radius < maxRadius * time) {
					const x = startX + radius * Math.cos(angle) * smallNoise(0.15 * this.noiseAmount)
					const y = startY + radius * Math.sin(angle)

					ctx.lineTo(x, y)

					angle += angleStep
					radius += radiusStep
				}
			}

			draw() {
				if (this.state === "dead") {
					this.remove()
					return
				}

				ctx.strokeStyle = this.color
				ctx.lineWidth = 2

				ctx.save()
				const canvasCenterX = canvas.width / 2
				const objectX = this.x * canvas.width
				const scale = 1 + this.translateTime * Math.E * this.scaleFactor

				const fromCenterX = objectX - canvasCenterX
				const pushFactor = scale - 1 // or tweak this
				const offsetX = fromCenterX * pushFactor
				ctx.translate(objectX + offsetX, 0)
				ctx.scale(scale, scale)
				ctx.translate(-objectX, 0)

				if (this.state === "stem") {
					this.drawStem()
					ctx.stroke()
				} else if (this.state === "spiral") {
					this.drawStem()
					this.drawSpiral()
					ctx.stroke()
				} else if (this.state === "decay") {
					this.drawStem()
					this.drawSpiral()
					ctx.stroke()
				}

				ctx.restore()
			}

			remove() {
				plants.delete(this)
			}
		}

		return (deltaTime, music) => {
			canvas.width = canvas.width
			ctx.fillStyle = "black"
			ctx.fillRect(0, 0, canvas.width, canvas.height)

			for (const plant of plants) {
				plant.draw()
			}

			if (!plants.size && !music) {
				plants.add(new Growth(0.5, 0.9, 50_000, "90deg 75% 50%", 0.5, Math.random(), 1.0))
			}

			if (music?.changed.beat && music.segment.current && music.section.current && music.beat.current?.perceivedLoudness) {
				// we hit a beat

				// determine the hue
				const picks = Array.from({length: 24}).map((_, i) => i * (360 / 24))
				const candidates = []
				for (let i = 0; i < music.section.current.keys.length; i++) {
					const confidence = music.section.current.keys[i]
					const addsCandidates = Math.floor(confidence * 25)
					const hue = picks[i]
					const a = Math.min(100, music.beat.current.perceivedLoudness * 100 + 25)
					for (let _ = 0; _ < addsCandidates; _++) {
						const hsl = `${hue - 180}deg ${a}% 50%`
						candidates.push(hsl)
					}
				}

				const n = music.section.current.keys.length * 0.2
				const maxXPer = 1 / n
				for (let i = 0; i < n; i++) {
					const pickedColor = candidates[Math.floor(candidates.length * Math.random())] ?? "white"
					const maxX = maxXPer * (i + 1)
					const minX = maxXPer * i
					plants.add(
						new Growth(
							minX + Math.random() * (maxX - minX),
							Math.max(1 - music.segment.current.rmsEnergy, 0.3) * 0.7 + Math.random() * 0.3,
							(music.beat.current.bpm / 60) * 1000,
							pickedColor,
							music.beat.current.perceivedLoudness,
							music.segment.current.deltaRms * 0.15,
							music.segment.current.perceivedLoudness
						)
					)
				}
			}
		}
	},
})
