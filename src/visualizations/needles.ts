import {MusicCanvas} from "../audio/canvas.ts"

MusicCanvas.registerVisualization("needles", {
	info: {
		author: "Benjamin Gwynn",
		name: "Needles",
		description: "Compass needles point to moving circles, only matches very specific music.",
		rating: 2,
	},
	does: (canvas) => {
		const ctx = canvas.getContext("2d")
		if (!ctx) throw new Error("cannot get 2d context")

		/** inclusive of min, exclusive of max */
		function rand(min, max) {
			return Math.random() * (max - min) + min
		}
		function randSign() {
			return Math.random() > 0.5 ? +1 : -1
		}

		let populationCap = 30
		const circles = new Set<Circle>()

		let maxSpeed = 1
		let minSpeed = 0
		let maxRadius = 0.1
		let maxAge = 3000
		let autoEnd = false
		let circleAlpha = 0.56
		let needleAlpha = 0.3
		let candidates = [`rgba(0,255,255, ${circleAlpha}`]

		function findNearestTarget(x: number, y: number) {
			if (circles.size === 0) return null

			let nearest = null
			let minDistSq = Infinity

			for (const target of circles) {
				const dx = x - target.x
				const dy = y - target.y
				const distSq = dx * dx + dy * dy

				if (distSq < minDistSq) {
					minDistSq = distSq
					nearest = target
				}
			}

			return nearest
		}

		function angleToTarget(origin, target) {
			const dx = target.x - origin.x
			const dy = target.y - origin.y

			// In screen space: y increases down, so 0° = up means we invert dy
			const angleRad = Math.atan2(dx, -dy) // Notice: dx first, -dy second
			const angleDeg = angleRad * (180 / Math.PI)

			// Ensure angle is in range [0, 360)
			return (angleDeg + 360) % 360
		}

		class Circle {
			x: number
			y: number
			radius: number
			vx: number
			vy: number
			born = performance.now()
			shrinking = false
			color
			constructor(x, y, radius = 0.01, vx = rand(minSpeed, maxSpeed) * randSign(), vy = rand(minSpeed, maxSpeed) * randSign()) {
				this.x = x
				this.y = y
				this.radius = radius
				this.vx = vx
				this.vy = vy
				this.color = candidates[Math.floor(candidates.length * Math.random())]
			}
			get age() {
				return performance.now() - this.born
			}
			draw() {
				ctx.lineWidth = 4
				const x = canvas.width * this.x
				const y = canvas.height * this.y
				const radius = canvas.width * this.radius
				ctx.strokeStyle = this.color
				ctx.fillStyle = this.color
				ctx.beginPath()
				ctx.arc(x, y, radius, 0, Math.PI * 2)
				ctx.fill()
				ctx.stroke()
			}
			end() {
				if (circles.size < populationCap / 2) {
					this.divide()
				} else {
					this.shrink()
				}
			}
			physics(deltaTime: number) {
				if (this.shrinking) {
					this.radius -= this.age * 1e-7
					if (this.radius <= 0) {
						this.remove()
						return
					}
				} else {
					this.radius += this.age * 1e-7
					if (this.radius > maxRadius) {
						this.radius = maxRadius
					}
					if (this.age > maxAge && autoEnd) {
						this.end()
						return
					}
				}

				this.x += (this.vx / canvas.width) * deltaTime
				this.y += (this.vy / canvas.height) * deltaTime

				// loop around
				const size = this.radius
				if (this.x < 0 - size) {
					this.x = 1 + size
				}
				if (this.x > 1 + size) {
					this.x = 0 - size
				}

				if (this.y < 0 - size) {
					this.y = 1 + size
				}
				if (this.y > 1 + size) {
					this.y = 0 - size
				}
			}
			shrink() {
				this.shrinking = true
			}
			remove() {
				circles.delete(this)
			}
			divide() {
				// targets.add(new Target(this.x,this.y,this.radius/2,this.vx,this.vy))
				circles.add(new Circle(this.x, this.y, this.radius / 2))
				this.shrink()
			}
		}

		const Neeedles = new Set<Needle>()
		class Needle {
			x: number
			y: number
			size: number
			currentAngle = 0
			targetAngle = 0
			angleSpeed = 0.3
			targetUpdateOffset
			lastTargetUpdate = 0
			constructor(x, y, size = 0.1, targetUpdateOffset) {
				this.x = x
				this.y = y
				this.size = size
				this.targetUpdateOffset = targetUpdateOffset
			}
			draw() {
				ctx.lineWidth = 3
				ctx.strokeStyle = this.color ?? "rgba(100,100,100," + needleAlpha + ")"
				const x = this.x * canvas.width
				const y = this.y * canvas.height
				const radius = this.size * Math.min(canvas.height, canvas.width)

				ctx.beginPath()
				ctx.moveTo(x, y)
				const angle = (this.currentAngle - 90) * (Math.PI / 180) // specify angle in degrees and convert to radians
				const lineLength = radius

				const dx = Math.cos(angle) * lineLength
				const dy = Math.sin(angle) * lineLength
				ctx.lineTo(x + dx, y + dy)
				ctx.stroke()
			}
			physics(dT) {
				let diff = ((this.targetAngle - this.currentAngle + 540) % 360) - 180
				const maxStep = this.angleSpeed * dT

				if (Math.abs(diff) <= maxStep) {
					this.currentAngle = this.targetAngle
				} else {
					this.currentAngle += Math.sign(diff) * maxStep
				}
			}

			targetNearest() {
				this.lastTargetUpdate = performance.now()
				const nearest = findNearestTarget(this.x, this.y)
				if (!nearest) {
					return
				}
				const [hsl] = nearest.color.split("/")
				this.color = hsl + "/ " + needleAlpha * 100 + "%)"
				const angle = angleToTarget(this, nearest)
				this.targetAngle = angle
			}
		}

		function makeNeedles() {
			Neeedles.clear()
			const thingSize = 0.05
			for (let x = 0; x <= 1; x += thingSize * (canvas.height / canvas.width)) {
				for (let y = 0; y <= 1 + thingSize; y += thingSize) {
					Neeedles.add(new Needle(x, y, thingSize / 2, Neeedles.size))
				}
			}
		}

		makeNeedles()
		let lastWidth = canvas.width
		let lastHeight = canvas.height
		return (dT, music) => {
			if (lastWidth !== canvas.width || lastHeight !== canvas.height) {
				makeNeedles()
			}

			if (music && music.section.current) {
				autoEnd = true
				maxAge = music.section.current.bpm.avg * 20
				maxRadius = music.section.current.perceivedLoudness.avg
				maxSpeed = Math.max(0.1, music.segment.current.perceivedLoudness)
				minSpeed = Math.min(0.05, maxSpeed)

				if (music.beat.current && music.changed.beat) {
					// determine the hue
					const picks = Array.from({length: 24}).map((_, i) => (i * (360 / 24) + 78) % 360)
					const newCandidates = []
					for (let i = 0; i < music.section.current.keys.length; i++) {
						const confidence = music.section.current.keys[i]
						const addsCandidates = Math.floor(confidence * 30)
						const hue = picks[i]
						const a = Math.min(100, music.segment.current.perceivedLoudness * 100 + 25)
						for (let _ = 0; _ < addsCandidates; _++) {
							const hsl = `hsl(${hue}deg ${a}% 55% / ${circleAlpha * 100}%)`
							newCandidates.push(hsl)
						}
					}
					candidates = newCandidates
					populationCap = candidates.length * 2
				}

				// kill/spawn stuff with music
				if (music.changed.section) {
					const spawnN = circles.size
					for (let i = 0; i < spawnN; i++) {
						const circle = circles[i]
						if (circle) {
							circle.divide()
						}
					}
				} else {
					if (music.changed.beat) {
						const tars = [...circles]
						for (let i = 0; i < 6; i++) {
							const targetToEnd = tars[Math.floor(tars.length * Math.random())]
							targetToEnd?.end()
						}
					}
					if (music.changed.tatum) {
						const tars = [...circles]
						for (let i = 0; i < 2; i++) {
							const targetToEnd = tars[Math.floor(tars.length * Math.random())]
							targetToEnd?.end()
						}
					}
				}
			} else {
				autoEnd = true
			}

			lastWidth = canvas.width
			lastHeight = canvas.height
			// canvas.width=canvas.width // reset canvas

			// Create a fading trail effect by drawing a semi-transparent rectangle

			if (music && music.segment && music.section) {
				// const delta = Math.abs(music.segment.prev.lowEnergy-music.segment.current.lowEnergy)
				const delta = music.segment.current.perceivedLoudness * 0.3
				ctx.fillStyle = `rgba(0, 0, 0, ${delta})`
			} else {
				ctx.fillStyle = `rgba(0,0,0,0.5)`
			}
			ctx.fillRect(0, 0, canvas.width, canvas.height)

			// if we ran out of targets/don't have any yet, make one
			if (!circles.size) {
				circles.add(new Circle(0.5, 0.5))
			}

			for (const target of circles) {
				target.physics(dT)
			}
			for (const circle of circles) {
				circle.draw()
			}

			let i = 0
			for (const needle of Neeedles) {
				if (performance.now() > needle.lastTargetUpdate + needle.targetUpdateOffset) {
					needle.targetNearest()
				}
				needle.physics(dT)
				needle.draw()
				i++
			}
		}
	},
})
