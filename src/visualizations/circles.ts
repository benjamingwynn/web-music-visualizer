import {MusicCanvas} from "../audio/canvas.ts"

MusicCanvas.registerVisualization("circles", {
	info: {
		name: "Circles",
		author: "benjamin",
		description: "a very simple example visualization",
	},
	does: (canvas) => {
		//
		// do setup here
		//
		const ctx = canvas.getContext("2d")
		if (!ctx) throw new Error("Could not create 2D canvas context")

		/**  inclusive of min, exclusive of max */
		function rand(min: number, max: number): number {
			return Math.random() * (max - min) + min
		}
		function randSign(): 1 | -1 {
			return Math.random() < 0.5 ? -1 : 1
		}

		const avDecay = 0.99

		class Circle {
			x = rand(0, 1)
			y = rand(0, 1)
			vx = rand(0.00001, 0.0001) * randSign()
			vy = rand(0.00001, 0.0001) * randSign()
			avx = 0
			avy = 0
			size = rand(0.03, 0.05)
			color = "cyan"

			tick(dT: number) {
				this.x += (this.vx + this.avx) * dT
				this.y += (this.vy + this.avy) * dT

				// handle avx/avy decay
				this.avx *= Math.pow(avDecay, dT)
				this.avy *= Math.pow(avDecay, dT)

				//loop around
				if (this.x > 1 + this.size) {
					this.x = 0 - this.size
				} else if (this.x < 0 - this.size) {
					this.x = 1 + this.size
				}

				if (this.y > 1 + this.size) {
					this.y = 0 - this.size
				} else if (this.y < 0 - this.size) {
					this.y = 1 + this.size
				}
			}
		}

		const circles = Array.from({length: 24}).map(() => new Circle())

		return (deltaTime, music) => {
			//
			// draw stuff here
			//
			ctx.clearRect(0, 0, canvas.width, canvas.height)

			ctx.strokeStyle = "black"
			let i = 0
			for (const circle of circles) {
				const x = circle.x * canvas.width
				const y = circle.y * canvas.height
				if (music && music.changed.beat && music.section.current) {
					circle.avx += rand(0.003, 0.005) * randSign() * music.section.current.perceivedLoudness.avg
					circle.avy += rand(0.003, 0.005) * randSign() * music.section.current.perceivedLoudness.avg

					// you also have the following available:
					// most numbers are in the range 0-1 other than start, which represents time in seconds

					// type AudioTrackerContext = { // this is the `music` argument, and can be undefined if music processing is still loading
					// 	changed: {
					// 		beat: boolean
					// 		section: boolean
					// 		tatum: boolean
					// 		segment: boolean
					// 	}
					// 	beat: AudioMoment<DetectedBeat>
					// 	section: AudioMoment<DetectedSection>
					// 	tatum: AudioMoment<PositionEstimate>
					// 	segment: AudioMoment<DetectedSegment>
					// }
					// type AudioMoment<T> {
					// 	current: T | undefined
					// 	next: T | undefined
					// 	prev: T | undefined
					// }
					// type PositionEstimate = {
					// 	confidence: number;
					// 	start: number;
					// 	index: number;
					// };
					// type DetectedBeat = {
					// 	start: number;
					// 	confidence: number;
					// 	perceivedLoudness: number;
					// 	index: number;
					// 	bpm: number;
					// };
					// type StatisticalRange = {
					// 	min: number;
					// 	max: number;
					// 	avg: number;
					// };
					// type DetectedSection = {
					// 	start: number;
					// 	confidence: number;
					// 	keys: Float32Array;
					// 	index: number;
					// 	bpm: StatisticalRange;
					// 	perceivedLoudness: StatisticalRange;
					// 	segments: DetectedSegment[];
					// };
					// type DetectedSegment = {
					// 	start: number;
					// 	rmsEnergy: number;
					// 	deltaRms: number;
					// 	lowEnergy: number;
					// 	midEnergy: number;
					// 	highEnergy: number;
					// 	zeroCrossingRate: number;
					// 	perceivedLoudness: number;
					// };
				}
				ctx.fillStyle = circle.color
				circle.tick(deltaTime)
				ctx.beginPath()
				ctx.arc(x, y, circle.size * Math.min(canvas.width, canvas.height), 0, Math.PI * 2)
				ctx.fill()
				ctx.stroke()
				i++
			}
		}
	},
})
