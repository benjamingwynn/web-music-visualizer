import {MusicCanvas} from "api"

/** isolated canvas handles the glitching effect */
class PredictiveCanvas {
	readonly outputCanvas: HTMLCanvasElement
	readonly outputCtx: CanvasRenderingContext2D
	readonly sourceCanvas: HTMLCanvasElement
	readonly sourceCtx: CanvasRenderingContext2D
	private readonly internalCanvas: HTMLCanvasElement
	private readonly internalCtx: CanvasRenderingContext2D
	private readonly presentCanvas: HTMLCanvasElement
	private readonly presentCtx: CanvasRenderingContext2D

	renderWidth: number
	renderHeight: number
	width: number
	height: number
	blockSize: number
	keyframeInterval: number
	motionRadius: number
	budget: number
	seed: number
	smoothing: boolean
	followOutputSize: boolean
	frameIndex = 0
	fullWork = 0
	blockCount = 0

	private blocksX = 0
	private blocksY = 0
	private lastOutputWidth: number
	private lastOutputHeight: number
	private lastKeyframeFrame: number | null = null
	private encoderReference: Uint8ClampedArray | null = null
	private decoderReference: Uint8ClampedArray | null = null
	private forceKeyframe = true

	constructor(outputCanvas: HTMLCanvasElement, options: any = {}) {
		this.outputCanvas = outputCanvas
		this.outputCtx = this.get2d(outputCanvas, {alpha: false})
		this.lastOutputWidth = outputCanvas.width
		this.lastOutputHeight = outputCanvas.height
		this.renderWidth = options.renderWidth ?? outputCanvas.width
		this.renderHeight = options.renderHeight ?? outputCanvas.height
		this.followOutputSize = options.followOutputSize ?? true

		this.sourceCanvas = document.createElement("canvas")
		this.sourceCanvas.width = this.renderWidth
		this.sourceCanvas.height = this.renderHeight
		this.sourceCtx = this.get2d(this.sourceCanvas, {alpha: false})
		this.internalCanvas = document.createElement("canvas")
		this.internalCtx = this.get2d(this.internalCanvas, {
			alpha: false,
			willReadFrequently: true,
		})
		this.presentCanvas = document.createElement("canvas")
		this.presentCtx = this.get2d(this.presentCanvas, {alpha: false})

		this.width = options.width ?? 320
		this.height = options.height ?? 180
		this.blockSize = options.blockSize ?? 16
		this.keyframeInterval = options.keyframeInterval ?? 90
		this.motionRadius = options.motionRadius ?? 6
		this.budget = options.budget ?? Infinity
		this.seed = options.seed
		this.smoothing = options.smoothing ?? false
		this.resizeInternal()
	}

	private get2d(canvas: HTMLCanvasElement, options: CanvasRenderingContext2DSettings): CanvasRenderingContext2D {
		const ctx = canvas.getContext("2d", options)
		if (!ctx) throw new Error("PredictiveCanvas requires Canvas 2D support")
		return ctx
	}

	private syncOutputSize(): void {
		const outW = this.outputCanvas.width
		const outH = this.outputCanvas.height
		if (outW === this.lastOutputWidth && outH === this.lastOutputHeight) return
		this.lastOutputWidth = outW
		this.lastOutputHeight = outH
		if (!this.followOutputSize) return

		this.renderWidth = outW
		this.renderHeight = outH
		this.sourceCanvas.width = outW
		this.sourceCanvas.height = outH
	}

	private resizeInternal(): void {
		this.internalCanvas.width = this.presentCanvas.width = this.width
		this.internalCanvas.height = this.presentCanvas.height = this.height
		this.blocksX = Math.ceil(this.width / this.blockSize)
		this.blocksY = Math.ceil(this.height / this.blockSize)
		this.blockCount = this.blocksX * this.blocksY
		this.fullWork = this.blockCount * 3
		this.resetReferences()
	}

	requestKeyframe(): void {
		this.forceKeyframe = true
	}

	resetReferences(): void {
		this.encoderReference = null
		this.decoderReference = null
		this.lastKeyframeFrame = null
		this.requestKeyframe()
	}

	render(drawSource: (ctx: CanvasRenderingContext2D, frame: number) => void) {
		this.syncOutputSize()
		const ctx = this.sourceCtx
		ctx.save()
		try {
			ctx.setTransform(1, 0, 0, 1, 0, 0)
			ctx.globalAlpha = 1
			ctx.globalCompositeOperation = "source-over"
			drawSource(ctx, this.frameIndex)
		} finally {
			ctx.restore()
		}
		return this.run()
	}

	private run() {
		const w = this.width
		const h = this.height
		this.internalCtx.imageSmoothingEnabled = true
		this.internalCtx.drawImage(this.sourceCanvas, 0, 0, w, h)
		const source = this.internalCtx.getImageData(0, 0, w, h).data
		const intra = this.forceKeyframe || this.encoderReference === null || (this.keyframeInterval > 0 && this.lastKeyframeFrame !== null && this.frameIndex - this.lastKeyframeFrame >= this.keyframeInterval)
		this.forceKeyframe = false
		if (intra) this.lastKeyframeFrame = this.frameIndex

		const packet = this.encode(source, intra)
		const {pixels, spent} = this.decode(packet)

		this.encoderReference = new Uint8ClampedArray(source)
		this.decoderReference = pixels
		this.presentCtx.putImageData(new ImageData(pixels, w, h), 0, 0)
		this.outputCtx.imageSmoothingEnabled = this.smoothing
		this.outputCtx.drawImage(this.presentCanvas, 0, 0, this.outputCanvas.width, this.outputCanvas.height)
		this.frameIndex++
	}

	private encode(source: Uint8ClampedArray, intra: boolean): any {
		const w = this.width
		const h = this.height
		const previous = this.encoderReference
		const residual = new Int16Array(w * h * 3)
		const blocks: any[] = new Array(this.blockCount)
		let b = 0
		for (let by = 0; by < h; by += this.blockSize) {
			for (let bx = 0; bx < w; bx += this.blockSize) {
				const bw = Math.min(this.blockSize, w - bx)
				const bh = Math.min(this.blockSize, h - by)
				const [dx, dy] = !intra && previous ? this.findMotion(source, previous, bx, by, bw, bh) : [0, 0]
				let totalR = 0
				let totalG = 0
				let totalB = 0
				for (let y = by; y < by + bh; y++)
					for (let x = bx; x < bx + bw; x++) {
						const p = y * w + x
						const i = p * 4
						const r = p * 3
						let pr = 0
						let pg = 0
						let pb = 0
						if (!intra && previous) {
							const rx = Math.max(0, Math.min(w - 1, x + dx))
							const ry = Math.max(0, Math.min(h - 1, y + dy))
							const ri = (ry * w + rx) * 4
							pr = previous[ri]
							pg = previous[ri + 1]
							pb = previous[ri + 2]
						}
						const dr = source[i] - pr
						const dg = source[i + 1] - pg
						const db = source[i + 2] - pb
						residual[r] = dr
						residual[r + 1] = dg
						residual[r + 2] = db
						totalR += dr
						totalG += dg
						totalB += db
					}
				const n = bw * bh
				blocks[b++] = {
					x: bx,
					y: by,
					w: bw,
					h: bh,
					dx,
					dy,
					meanR: Math.round(totalR / n),
					meanG: Math.round(totalG / n),
					meanB: Math.round(totalB / n),
				}
			}
		}
		return {intra, blocks, residual}
	}

	private findMotion(current: Uint8ClampedArray, prev: Uint8ClampedArray, x0: number, y0: number, bw: number, bh: number): [number, number] {
		const w = this.width
		const h = this.height
		const score = (dx: number, dy: number, bestLimit = Infinity): number => {
			let error = 0
			const stride = Math.max(2, Math.floor(this.blockSize / 4))
			for (let iy = 0; iy < bh; iy += stride)
				for (let ix = 0; ix < bw; ix += stride) {
					const x = x0 + ix
					const y = y0 + iy
					const rx = Math.max(0, Math.min(w - 1, x + dx))
					const ry = Math.max(0, Math.min(h - 1, y + dy))
					const a = (y * w + x) * 4
					const b = (ry * w + rx) * 4
					error += 3 * Math.abs(current[a] - prev[b])
					error += 4 * Math.abs(current[a + 1] - prev[b + 1])
					error += 2 * Math.abs(current[a + 2] - prev[b + 2])
					if (error >= bestLimit) return error
				}
			return error
		}
		let best = score(0, 0)
		let bestDx = 0
		let bestDy = 0
		for (let dy = -this.motionRadius; dy <= this.motionRadius; dy += 2) {
			for (let dx = -this.motionRadius; dx <= this.motionRadius; dx += 2) {
				if (dx === 0 && dy === 0) continue
				const e = score(dx, dy, best)
				if (e < best) {
					best = e
					bestDx = dx
					bestDy = dy
				}
			}
		}
		return [bestDx, bestDy]
	}

	private blockOrder(): Uint32Array {
		const order = new Uint32Array(this.blockCount)
		for (let i = 0; i < order.length; i++) order[i] = i
		let state = (this.seed ^ Math.imul(this.frameIndex + 1, 0x9e3779b1)) >>> 0
		const random = (): number => {
			state ^= state << 13
			state ^= state >>> 17
			state ^= state << 5
			return state >>> 0
		}
		for (let i = order.length - 1; i > 0; i--) {
			const j = random() % (i + 1)
			const t = order[i]
			order[i] = order[j]
			order[j] = t
		}
		return order
	}

	private decode(packet: any) {
		const w = this.width
		const h = this.height
		const src = this.decoderReference
		const working = new Int16Array(w * h * 3)
		if (src) {
			for (let p = 0; p < w * h; p++) {
				const i = p * 4
				const j = p * 3
				working[j] = src[i]
				working[j + 1] = src[i + 1]
				working[j + 2] = src[i + 2]
			}
		}
		const order = this.blockOrder()
		const limit = this.budget === Infinity ? this.fullWork : Math.max(0, Math.floor(this.budget))
		const residual = packet.residual
		let spent = 0
		outer: for (let pass = 0; pass < 3; pass++) {
			for (let k = 0; k < order.length; k++) {
				if (spent >= limit) break outer
				const block = packet.blocks[order[k]]
				const {x, y, w: bw, h: bh, dx, dy, meanR, meanG, meanB} = block
				for (let py = y; py < y + bh; py++)
					for (let px = x; px < x + bw; px++) {
						const p = py * w + px
						const j = p * 3
						if (pass === 0) {
							if (packet.intra || !src) {
								working[j] = working[j + 1] = working[j + 2] = 0
							} else {
								const rx = Math.max(0, Math.min(w - 1, px + dx))
								const ry = Math.max(0, Math.min(h - 1, py + dy))
								const s = (ry * w + rx) * 4
								working[j] = src[s]
								working[j + 1] = src[s + 1]
								working[j + 2] = src[s + 2]
							}
						} else if (pass === 1) {
							working[j] += meanR
							working[j + 1] += meanG
							working[j + 2] += meanB
						} else {
							working[j] += residual[j] - meanR
							working[j + 1] += residual[j + 1] - meanG
							working[j + 2] += residual[j + 2] - meanB
						}
					}
				spent++
			}
		}
		const result = new Uint8ClampedArray(w * h * 4)
		for (let p = 0; p < w * h; p++) {
			const i = p * 4
			const j = p * 3
			result[i] = working[j]
			result[i + 1] = working[j + 1]
			result[i + 2] = working[j + 2]
			result[i + 3] = 255
		}
		return {pixels: result, spent}
	}
}

function lerp(a: number, b: number, t: number) {
	return a + (b - a) * t
}

MusicCanvas.registerVisualization("glitch", {
	info: {
		name: "Glitch",
		author: "Benjamin Gwynn",
		description: "Simulated video decoding effect, moves and glitches with the music.",
	},
	does: (masterCanvas: HTMLCanvasElement) => {
		const MIN_BUDGET = 4000
		const MAX_BUDGET = 4300

		const engineOpts = {
			width: 320,
			height: 280,
			blockSize: 8,
			keyframeInterval: 0,
			seed: 120249,
			budget: Infinity,
		}

		let engine = new PredictiveCanvas(masterCanvas, engineOpts)

		const targets = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
		const targetsRender = [0.5, 0.4, 0.3, 0.5, 0.8, 0, 0, 0, 0, 0.5, 0, 0, 0, 0.4, 0, 0, 0.1, 0.2, 0.3, 0.4, 0, 0, 0, 0.3]
		const n = targetsRender.length

		const BG_INIT = 260
		let bg = BG_INIT
		let bgRender = BG_INIT

		let z = 0.5
		let zRender = 0.5

		let bgSpeed = 0.2
		let mSpeed = 0.001
		let zSpeed = 0.4
		let speed = 0.1
		let m = 0.0
		let mRender = 0.0
		let mPhase = 0
		const length = targets.length

		let frameCount = 0
		let frameCounter = 0

		return (deltaTime, music) => {
			frameCount += deltaTime
			frameCounter++
			const t = deltaTime / 60

			for (let i = 0; i < length; i++) {
				if (music) {
					targets[i] = music.segment.current?.spectrum[i]
				}
				if (targets[i] > targetsRender[i]) targetsRender[i] += t * speed
				if (targets[i] < targetsRender[i]) targetsRender[i] -= t * speed

				if (bg > bgRender) bgRender += t * bgSpeed
				if (bg < bgRender) bgRender -= t * bgSpeed

				if (z > zRender) zRender += t * zSpeed
				if (z < zRender) zRender -= t * zSpeed

				if (m > mRender) mRender += t * mSpeed
				if (m < mRender) mRender -= t * mSpeed
			}

			mPhase += deltaTime * mRender

			const scene = (ctx: CanvasRenderingContext2D, deltaTime: number) => {
				const {width, height} = ctx.canvas
				ctx.fillRect(0, 0, width, height)

				for (let i = 0; i < 10; i++) {
					const scale = (1 - i * 0.1 + mPhase * 0.0005) % 1
					ctx.lineWidth = Math.max(height, width) * 0.01 * Math.pow(scale, 3)
					const mI = music ? music.section.current?.keys.indexOf([...music.section.current.keys].sort()[0]) : 0
					ctx.strokeStyle = `hsl(${((mI + 128) * (360 / n)) % 360}deg 70% 27%)`
					ctx.strokeRect((width - width * scale) / 2, (height - height * scale) / 2, width * scale, height * scale)
				}

				if (music) {
					ctx.fillStyle = `hsl(${bgRender % 360}deg 100% 70%)`
					const rows = 100
					const cols = 100
					const offset = ((mPhase % cols) + cols) % cols // 0..99

					for (let x = -1; x < Math.ceil(width / cols) + 1; x++) {
						for (let y = -1; y < Math.ceil(height / rows) + 1; y++) {
							ctx.fillStyle = `hsl(${(bgRender + x * 2) % 360}deg 100% 70%)`
							ctx.fillRect(cols * x, rows * y + offset, 22 * z, 22 * z)
						}
					}

					for (let i = 0; i < n; i++) {
						const k = music.section.current?.keys[i]
						ctx.font = height / n + "px monospace"
						ctx.fillStyle = `hsl(${i * (360 / n)}deg ${(k ?? 0) * 100}% 65%)`
						const text = ">" + (k ? k.toFixed(20) : "music")
						ctx.fillText(text, (width - ctx.measureText(text).width) * targetsRender[i], (n - i + 0.5) * (height / (n + 1)))
					}
				}
			}

			if (music && music.segment.current && music.section.current) {
				if (music.changed.tatum) {
					engine.budget = lerp(MIN_BUDGET, MAX_BUDGET, music.segment.current.lowEnergy - music.segment.current.midEnergy)
				}
				if (music.changed.beat) {
					engine.resetReferences()
				}
				if (music.changed.section) {
					console.log("section changed!!!!")
					engine = new PredictiveCanvas(masterCanvas, engineOpts)
				}
				z = music.segment.current.perceivedLoudness
				bg = BG_INIT + music.section.current.index * 67
				m = 0.0035 * music.section.current.bpm.min
			}

			engine.render(scene)
		}
	},
})
