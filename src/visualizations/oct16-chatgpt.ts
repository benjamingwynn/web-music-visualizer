import {MusicCanvas} from "api"

MusicCanvas.registerVisualization("resonance", {
	info: {
		name: "Resonance",
		author: "OpenAI / ChatGPT [GPT-6 Astra]",
		description: "A fixed horizon travelling through a drifting star system. Harmony shapes its rings; rhythm moves through them.",
	},

	does(canvas, signal) {
		const ctx = canvas.getContext("2d")
		if (!ctx) return () => {}

		const TAU = Math.PI * 2
		const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v))
		const mod = (v, n) => ((v % n) + n) % n
		const valid = (v) => typeof v === "number" && Number.isFinite(v)
		const approach = (a, b, speed, dt) => a + (b - a) * (1 - Math.exp(-speed * dt))

		let seed = 8137
		const random = () => {
			seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
			return seed / 4294967296
		}

		const pitchesOf = (segment) => {
			const p = segment && (segment.pitches || segment.chroma)
			return p && p.length >= 12 ? p : undefined
		}

		const loudnessOf = (segment) => {
			if (!segment) return undefined
			const values = [segment.loudness_max, segment.loudnessMax, segment.loudness, segment.loudness_start, segment.loudnessStart]

			for (const value of values) {
				if (valid(value)) {
					return value > 0 && value <= 1 ? value : clamp((value + 48) / 42)
				}
			}

			return undefined
		}

		const stars = Array.from({length: 760}, () => ({
			x: random(),
			y: random(),
			depth: random(),
			phase: random() * TAU,
			size: 0.35 + random() * 0.9,
			warm: random() > 0.83,
		}))

		const lanes = Array.from({length: 38}, (_, i) => ({
			f: i / 37,
			radius: 0,
			wave: 0,
		}))

		const sparks = Array.from({length: 125}, () => ({
			lane: Math.floor(random() * lanes.length),
			angle: random() * TAU,
			length: 0.012 + random() * 0.032,
			size: 0.55 + random() * 0.8,
		}))

		const chroma = new Float32Array(12)
		const notes = new Float32Array(12)
		const waves = []

		const bloom = document.createElement("canvas")
		const bloomCtx = bloom.getContext("2d")

		// Cached nebula sprites: soft atmospheric motion without rebuilding
		// large gradients on every frame.
		const clouds = Array.from({length: 4}, (_, i) => {
			const sprite = document.createElement("canvas")
			sprite.width = sprite.height = 256
			const c = sprite.getContext("2d")

			if (c) {
				const tint = [218, 253, 286, 200][i]
				const gradient = c.createRadialGradient(128, 128, 0, 128, 128, 128)
				gradient.addColorStop(0, `hsla(${tint},65%,40%,0.12)`)
				gradient.addColorStop(0.35, `hsla(${tint},60%,30%,0.07)`)
				gradient.addColorStop(0.7, `hsla(${tint},55%,20%,0.025)`)
				gradient.addColorStop(1, `hsla(${tint},55%,15%,0)`)
				c.fillStyle = gradient
				c.fillRect(0, 0, 256, 256)
			}

			return {
				sprite,
				x: random(),
				y: random(),
				depth: 0.03 + i * 0.035,
				scale: 0.4 + random() * 0.22,
			}
		})

		let clock = 0
		let orbitalTime = 0
		let previousWall = performance.now()
		let previousTime
		let lastBeat, lastSection, lastTatum
		let loud = 0.25
		let slowLoud = 0.25
		let harmony = 0
		let hue = 0,
			hueTarget = 0
		let starEnergy = 0
		let fineEnergy = 0
		let cachedW = 0,
			cachedH = 0
		let background, corona, vignette

		signal.addEventListener(
			"abort",
			() => {
				waves.length = 0
				bloom.width = bloom.height = 1
				for (const cloud of clouds) {
					cloud.sprite.width = cloud.sprite.height = 1
				}
			},
			{once: true}
		)

		return (_deltaTime, music) => {
			if (signal.aborted || !canvas.width || !canvas.height) return

			const now = performance.now()
			const wallDt = clamp((now - previousWall) / 1000, 0, 0.05)
			previousWall = now

			const time = music && valid(music.time) ? music.time : undefined
			const seeking = time !== undefined && previousTime !== undefined && (time < previousTime || time - previousTime > 0.5)

			const dt = time === undefined || previousTime === undefined ? wallDt : clamp(time - previousTime, 0, 0.05)

			previousTime = time
			clock += dt

			if (seeking) {
				waves.length = 0
				chroma.fill(0)
				lastBeat = lastSection = lastTatum = undefined
				starEnergy = fineEnergy = 0
			}

			const segment = music?.segment?.current
			const pitches = pitchesOf(segment)
			const loudTarget = loudnessOf(segment)

			loud = approach(loud, loudTarget ?? 0.3, loudTarget !== undefined && loudTarget > loud ? 10 : 3, dt)
			slowLoud = approach(slowLoud, loud, 1.8, dt)
			harmony = approach(harmony, pitches ? 1 : 0, 3, dt)
			orbitalTime += dt * (0.8 + slowLoud * 0.45)

			let pitchScale = 1
			if (pitches) {
				for (let i = 0; i < 12; i++) {
					if (valid(pitches[i])) {
						pitchScale = Math.max(pitchScale, pitches[i])
					}
				}
			}

			for (let i = 0; i < 12; i++) {
				const raw = pitches && valid(pitches[i]) ? clamp(pitches[i] / pitchScale) : 0
				const target = Math.pow(raw, 1.35)

				chroma[i] = approach(chroma[i], target, target > chroma[i] ? 13 : 4, dt)
			}

			for (let k = 0; k < 12; k++) {
				notes[k] = chroma[(k * 7) % 12]
			}

			if (music) {
				const beat = music.beat?.current
				if (music.changed.beat && beat !== lastBeat) {
					lastBeat = beat
					waves.push({age: 0, strength: 0.55 + loud * 0.45})
					if (waves.length > 10) waves.shift()
				}

				const tatum = music.tatum?.current
				if (music.changed.tatum && tatum !== lastTatum) {
					lastTatum = tatum
					fineEnergy = 1
				}

				const section = music.section?.current
				if (music.changed.section && section !== lastSection) {
					lastSection = section
					hueTarget += 37
				}
			}

			fineEnergy *= Math.exp(-dt * 10)
			hue = approach(hue, hueTarget, 0.45, dt)

			let beatEnergy = 0
			for (let i = waves.length - 1; i >= 0; i--) {
				const wave = waves[i]
				wave.age += dt

				if (wave.age > 2.7) {
					waves.splice(i, 1)
					continue
				}

				beatEnergy += wave.strength * (1 - Math.exp(-wave.age * 28)) * Math.exp(-wave.age * 5)
			}

			starEnergy = approach(starEnergy, Math.min(1, beatEnergy), 15, dt)

			const w = canvas.width
			const h = canvas.height
			const S = Math.min(w, h)
			const cx = w / 2
			const cy = h / 2
			const R = S * 0.12
			const pixel = Math.max(0.6, S / 900)

			const rotation = orbitalTime * 0.07
			const tilt = 0.43 + Math.sin(clock * 0.075) * 0.025
			const roll = -0.23 + Math.sin(clock * 0.05) * 0.025

			const colour = (k, f, light, alpha) => `hsla(${mod(30 + hue + k * 25 - f * 35, 360)},` + `92%,${clamp(light, 0, 100)}%,${clamp(alpha)})`

			const noteAt = (angle) => {
				const position = mod((angle / TAU) * 12, 12)
				const index = Math.floor(position)
				const fraction = position - index
				const mix = fraction * fraction * (3 - 2 * fraction)

				return notes[index] * (1 - mix) + notes[(index + 1) % 12] * mix
			}

			if (cachedW !== w || cachedH !== h) {
				cachedW = w
				cachedH = h

				const scale = Math.min(0.25, 600 / Math.max(w, h))
				bloom.width = Math.max(1, Math.round(w * scale))
				bloom.height = Math.max(1, Math.round(h * scale))

				background = ctx.createRadialGradient(cx, cy, R * 0.3, cx, cy, S * 0.8)
				background.addColorStop(0, "#0c0c18")
				background.addColorStop(0.4, "#040713")
				background.addColorStop(1, "#010208")

				corona = ctx.createRadialGradient(0, 0, R * 0.975, 0, 0, R * 1.22)
				corona.addColorStop(0, "rgba(255,207,155,0)")
				corona.addColorStop(0.09, "rgba(255,235,204,0.9)")
				corona.addColorStop(0.17, "rgba(255,183,121,0.4)")
				corona.addColorStop(0.45, "rgba(255,130,102,0.09)")
				corona.addColorStop(1, "rgba(255,130,102,0)")

				vignette = ctx.createRadialGradient(cx, cy, S * 0.28, cx, cy, Math.hypot(w, h) * 0.55)
				vignette.addColorStop(0, "rgba(0,0,6,0)")
				vignette.addColorStop(0.65, "rgba(0,0,6,0.07)")
				vignette.addColorStop(1, "rgba(0,0,6,0.5)")
			}

			ctx.save()
			ctx.setTransform(1, 0, 0, 1, 0, 0)
			ctx.globalAlpha = 1
			ctx.globalCompositeOperation = "source-over"
			ctx.filter = "none"
			ctx.shadowBlur = 0
			ctx.fillStyle = background
			ctx.fillRect(0, 0, w, h)
			ctx.lineCap = "round"
			ctx.lineJoin = "round"

			// The system moves past the camera:
			// slow background rotation and right-to-left depth parallax.
			const skyAngle = clock * 0.011
			const skyCos = Math.cos(skyAngle)
			const skySin = Math.sin(skyAngle)
			const field = Math.hypot(w, h) * 1.25

			const skyPosition = (x, y, depth) => {
				const rx = x * skyCos - y * skySin
				const ry = x * skySin + y * skyCos
				const travel = clock * S * (0.018 + depth * 0.034)

				return {
					x: cx + mod(rx - travel + field / 2, field) - field / 2,
					y: cy + mod(ry + field / 2, field) - field / 2,
				}
			}

			ctx.globalCompositeOperation = "lighter"

			// Tile only the soft cloud edges, so no cloud pops at a wrap.
			for (const cloud of clouds) {
				const p = skyPosition((cloud.x - 0.5) * field, (cloud.y - 0.5) * field, cloud.depth)
				const radius = S * cloud.scale
				const rx = radius * 1.35
				const ry = radius * 0.75

				for (let iy = -1; iy <= 1; iy++) {
					for (let ix = -1; ix <= 1; ix++) {
						const x = p.x + ix * field
						const y = p.y + iy * field

						if (x + rx < 0 || x - rx > w || y + ry < 0 || y - ry > h) continue

						ctx.drawImage(cloud.sprite, x - rx, y - ry, rx * 2, ry * 2)
					}
				}
			}

			for (const star of stars) {
				const p = skyPosition((star.x - 0.5) * field, (star.y - 0.5) * field, star.depth)

				if (p.x < -20 || p.x > w + 20 || p.y < -20 || p.y > h + 20) continue

				const response = starEnergy * star.depth ** 4
				const twinkle = 0.5 + 0.5 * Math.sin(clock * 0.55 + star.phase)
				const size = pixel * star.size * (0.55 + star.depth * 0.7)
				const trail = pixel * (0.35 + star.depth ** 3 * 2 + response * 2.5)
				const alpha = 0.08 + twinkle * 0.2 + star.depth * 0.17 + response * 0.25
				const rgb = star.warm ? "255,211,169" : "182,211,255"

				ctx.strokeStyle = `rgba(${rgb},${alpha})`
				ctx.lineWidth = size
				ctx.beginPath()
				ctx.moveTo(p.x, p.y)
				ctx.lineTo(p.x + trail, p.y)
				ctx.stroke()

				if (star.depth > 0.94 && star.size > 1) {
					ctx.fillStyle = `rgba(${rgb},${alpha * 0.12})`
					ctx.beginPath()
					ctx.arc(p.x, p.y, size * 3, 0, TAU)
					ctx.fill()
				}
			}

			for (const lane of lanes) {
				let wave = 0

				for (const impulse of waves) {
					const distance = lane.f - (impulse.age * 0.92 - 0.1)
					wave += Math.exp((-distance * distance) / 0.011) * Math.exp(-impulse.age * 0.75) * (1 - Math.exp(-impulse.age * 25)) * impulse.strength
				}

				lane.wave = Math.min(1, wave)
				lane.radius = R * (1.2 + lane.f * 2.15 + lane.wave * 0.09)
			}

			const point = (lane, a) => {
				const f = lane.f
				const note = noteAt(a - f * 0.65)
				const angle = a + rotation
				const envelope = Math.sin(Math.PI * f)

				const corrugation = Math.sin(a * 3 - orbitalTime * 0.24 + f * 11) * 0.018

				const radius = lane.radius + R * envelope * (note * 0.19 * harmony + corrugation)

				const height = R * envelope * note * harmony * (0.27 + slowLoud * 0.2) * Math.sin(a * 2 + f * 4 + orbitalTime * 0.12)

				return {
					x: Math.cos(angle) * radius,
					y: Math.sin(angle) * radius * tilt + height,
					front: Math.sin(angle) >= 0,
					note,
				}
			}

			ctx.translate(cx, cy)
			ctx.rotate(roll)

			const drawDisc = (front) => {
				for (const lane of lanes) {
					const f = lane.f
					const fade = 1 - f ** 3 * 0.88

					for (let k = 0; k < 12; k++) {
						const note = notes[k]
						const start = (k / 12) * TAU + f * 0.65
						const shimmer = 0.5 + 0.5 * Math.sin(f * 36 - orbitalTime * 0.35 + k * 0.45)
						const energy = note * harmony
						const alpha = (0.09 + shimmer ** 4 * 0.18 + energy * (0.24 + loud * 0.2) + lane.wave * 0.24) * fade

						ctx.strokeStyle = colour(k, f, 49 + energy * 20 + lane.wave * 16, alpha)
						ctx.lineWidth = pixel * (0.65 + energy * 0.65 + lane.wave * 0.35)

						ctx.beginPath()
						let connected = false

						for (let n = 0; n <= 10; n++) {
							const a = start + ((n / 10) * TAU) / 12
							const p = point(lane, a)

							if (p.front !== front) {
								connected = false
								continue
							}

							if (connected) ctx.lineTo(p.x, p.y)
							else ctx.moveTo(p.x, p.y)
							connected = true
						}

						ctx.stroke()
					}
				}

				// Brighter streaks make the disc's faster rotation unmistakable.
				for (const spark of sparks) {
					const lane = lanes[spark.lane]
					const speed = 0.2 + 0.55 * (1 - lane.f)
					const a = spark.angle + orbitalTime * speed
					const head = point(lane, a)
					if (head.front !== front) continue

					const tail = point(lane, a - spark.length * (1 + head.note + lane.wave))
					if (tail.front !== front) continue

					const k = mod(((a - lane.f * 0.65) / TAU) * 12, 12)
					const intensity = (0.22 + head.note * harmony * 0.5 + lane.wave * 0.32) * (1 - lane.f * 0.6)

					ctx.strokeStyle = colour(k, lane.f, 84, intensity)
					ctx.lineWidth = pixel * spark.size * (1 + fineEnergy * head.note * 0.3)
					ctx.beginPath()
					ctx.moveTo(tail.x, tail.y)
					ctx.lineTo(head.x, head.y)
					ctx.stroke()
				}
			}

			drawDisc(false)

			// Fixed silhouette: the camera tracks the horizon as space passes.
			ctx.globalCompositeOperation = "source-over"
			ctx.fillStyle = "#010208"
			ctx.beginPath()
			ctx.arc(0, 0, R, 0, TAU)
			ctx.fill()

			ctx.globalCompositeOperation = "lighter"
			ctx.fillStyle = corona
			ctx.beginPath()
			ctx.arc(0, 0, R * 1.22, 0, TAU)
			ctx.fill()

			ctx.strokeStyle = "rgba(255,239,215,0.6)"
			ctx.lineWidth = pixel * 0.8
			ctx.beginPath()
			ctx.arc(0, 0, R * 1.002, Math.PI * 1.08, Math.PI * 1.92)
			ctx.stroke()

			drawDisc(true)

			// Harmonic markers: fixed orbital radius, note-driven intensity.
			for (let k = 0; k < 12; k++) {
				const a = (k / 12) * TAU + rotation
				const note = notes[k] * harmony
				const orbit = R * 3.72
				const x = Math.cos(a) * orbit
				const y = Math.sin(a) * orbit * tilt
				const size = pixel * (0.65 + note * 1.5)

				ctx.fillStyle = colour(k, 0.8, 79, 0.08 + note * 0.7)
				ctx.beginPath()
				ctx.arc(x, y, size, 0, TAU)
				ctx.fill()

				if (note > 0.12) {
					ctx.strokeStyle = colour(k, 0.8, 68, note * 0.2)
					ctx.lineWidth = pixel * 0.65
					ctx.beginPath()
					ctx.ellipse(0, 0, orbit, orbit * tilt, 0, a - 0.025 - note * 0.045, a + 0.025 + note * 0.045)
					ctx.stroke()
				}
			}

			ctx.setTransform(1, 0, 0, 1, 0, 0)

			// Preserve sharp filaments underneath a soft optical glow.
			if (bloomCtx) {
				bloomCtx.setTransform(1, 0, 0, 1, 0, 0)
				bloomCtx.globalAlpha = 1
				bloomCtx.globalCompositeOperation = "copy"
				bloomCtx.filter = "none"
				bloomCtx.drawImage(canvas, 0, 0, bloom.width, bloom.height)

				ctx.globalCompositeOperation = "lighter"
				ctx.globalAlpha = 0.2 + slowLoud * 0.1
				ctx.filter = `blur(${Math.max(2, S * 0.005)}px)`
				ctx.drawImage(bloom, 0, 0, w, h)
			}

			ctx.filter = "none"
			ctx.globalAlpha = 1
			ctx.globalCompositeOperation = "source-over"
			ctx.fillStyle = vignette
			ctx.fillRect(0, 0, w, h)

			ctx.restore()
		}
	},
})
