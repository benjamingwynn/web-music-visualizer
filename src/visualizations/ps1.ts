import {MusicCanvas} from "../audio/canvas.ts"

MusicCanvas.registerVisualization("ps1", {
	info: {
		name: "PS1 Shape Emulator",
		author: "benjamin",
		description: "draws various shapes in sync with the music at PS1 resolution",
	},
	does: (masterCanvas) => {
		const masterCtx = masterCanvas.getContext("2d")
		if (!masterCtx) throw new Error("expected 2d context")

		const canvas = document.createElement("canvas")
		canvas.width = 320
		canvas.height = 240

		const cX = Math.floor(canvas.width / 2)
		const cY = Math.floor(canvas.height / 2)

		function rotate(origin: [number, number], points: [number, number][], angle: number): [number, number][] {
			const [ox, oy] = origin

			return points.map(([x, y]) => {
				const dx = x - ox
				const dy = y - oy

				const rotatedX = dx * Math.cos(angle) - dy * Math.sin(angle)
				const rotatedY = dx * Math.sin(angle) + dy * Math.cos(angle)

				return [rotatedX + ox, rotatedY + oy]
			})
		}

		const ctx = canvas.getContext("2d") as CanvasRenderingContext2D
		if (!ctx) throw new Error("Unable to get 2d context for canvas")
		const things = new Set<Thing>()

		function removeThing(thing: Thing) {
			things.delete(thing)
		}

		class Thing {
			constructor(
				private timeOffset: number = 0,
				private spinSpeed: number = 0.001,
				private growSpeed = 0.3,
				private shape: number = 6,
				private color = "white",
				private alt = false
			) {
				// .
			}
			public grow = true
			public size = 0

			tick(dt: number) {
				// increase size of thing
				if (this.grow) {
					if (this.alt) {
						this.size += (Math.pow(dt, this.growSpeed) * Math.E) / 2
					} else {
						this.size += Math.pow(dt, this.growSpeed)
					}
					// when size gets too big to display, destroy myself
					if (this.size > 500) {
						removeThing(this)
					}
				}
			}

			private getPoints(): [number, number][] {
				if (this.shape) {
					const n = this.shape
					const points: [number, number][] = Array.from({length: n}, (_, i) => {
						const angle = ((2 * Math.PI) / n) * i // 60° in radians * i
						return [cX + this.size * Math.cos(angle), cY + this.size * Math.sin(angle)]
					})
					return points
				}
				const points: [number, number][] = [
					// // left top
					[cX - this.size, cY - this.size],
					// // right top
					[cX + this.size, cY - this.size],
					// right bottom
					[cX + this.size, cY + this.size],
					// left bottom
					[cX - this.size, cY + this.size],
				]
				return points
			}

			draw() {
				const t = performance.now() + this.timeOffset
				const timeRotation = t * this.spinSpeed

				// this.rotation = rot
				const points = this.getPoints()
				ctx.beginPath()
				ctx.strokeStyle = this.color

				const rotatedPoints = rotate([cX, cY], points, timeRotation)
				for (let i = 0; i < rotatedPoints.length; i++) {
					const [x, y] = rotatedPoints[i]
					if (i === 0) {
						ctx.moveTo(Math.floor(x), Math.floor(y))
					} else {
						ctx.lineTo(Math.floor(x), Math.floor(y))
					}
				}
				const [[firstX, firstY]] = rotatedPoints
				ctx.lineTo(Math.floor(firstX), Math.floor(firstY))
				ctx.stroke()
			}
		}
		things.add(new Thing())

		return (dt, music) => {
			//  ... draw callback ...
			canvas.width = canvas.width
			// ctx.clearRect(0, 0, canvas.width, canvas.height)

			function addThing(offset: number, pickedColor: string) {
				if (music?.section.current) {
					things.add(
						new Thing(
							offset,
							music.section.current.perceivedLoudness.avg * 0.001,
							music?.section.current?.bpm.avg * 0.0001,
							(music.section.current.index % 5) + 3,
							pickedColor,
							music.section.current.perceivedLoudness.min > 0.2
						)
					)
				} else {
					things.add(new Thing(offset))
				}
			}

			if (music?.changed.beat && music.section.current && music.beat.current?.perceivedLoudness) {
				const makes = music.beat.current?.perceivedLoudness * 10

				// determine the hue
				const picks = Array.from({length: 24}).map((_, i) => i * (360 / 24))
				const candidates = []
				for (let i = 0; i < music.section.current.keys.length; i++) {
					const confidence = music.section.current.keys[i]
					const addsCandidates = Math.floor(confidence * 20)
					const hue = picks[i]
					const a = Math.min(100, music.beat.current.perceivedLoudness * 100 + 25)
					for (let _ = 0; _ < addsCandidates; _++) {
						const hsl = `hsl(${hue}deg ${a}% 50%)`
						candidates.push(hsl)
					}
				}
				const pickedColor = candidates[Math.floor(candidates.length * Math.random())] ?? "white"

				// console.log(makes)
				for (let i = 0; i < makes; i++) {
					addThing(i * 200, pickedColor)
				}
			}

			for (const thing of things) {
				thing.tick(dt)
				thing.draw()
			}

			if (!things.size && !music) {
				addThing(0, "white")
			}
			const scanHeight = masterCanvas.height / canvas.height

			ctx.filter = "blur(" + scanHeight + "px)"

			// draw onto the master canvas
			masterCanvas.width = masterCanvas.width
			masterCtx.fillStyle = "black"
			masterCtx.fillRect(0, 0, masterCanvas.width, masterCanvas.height)

			// draw onto the master canvas:

			let drawWidth, drawHeight, offsetX, offsetY

			const sourceAspect = canvas.width / canvas.height
			const targetAspect = masterCanvas.width / masterCanvas.height

			if (sourceAspect > targetAspect) {
				// Source is wider, fit to width
				drawWidth = masterCanvas.width
				drawHeight = masterCanvas.width / sourceAspect
				offsetX = 0
				offsetY = (masterCanvas.height - drawHeight) / 2
			} else {
				// Source is taller, fit to height
				drawHeight = masterCanvas.height
				drawWidth = masterCanvas.height * sourceAspect
				offsetX = (masterCanvas.width - drawWidth) / 2
				offsetY = 0
			}

			// Draw with aspect ratio preserved and black bars
			masterCtx.drawImage(canvas, offsetX, offsetY, drawWidth, drawHeight)

			// draw scanlines
			for (let y = 0; y < canvas.height; y++) {
				if (y % 2 === 0) {
					masterCtx.fillStyle = "rgba(0,0,0,0.1)"
					masterCtx.fillRect(0, y * scanHeight, masterCanvas.width, scanHeight)
				}
			}
		}
	},
})
