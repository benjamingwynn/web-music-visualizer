import {MusicCanvas} from "api"

MusicCanvas.registerVisualization("chroma-bloom-glasshouse", {
	info: {
		name: "Chroma Bloom · Glasshouse",
		author: "OpenAI / ChatGPT [GPT-6 Astra], adapted from Claude's Chroma Bloom III",
		description: "A suspended glass flower: harmonic petals, travelling light, orbital beads, and drifting pollen.",
	},

	does(canvas, signal) {
		const ctx = canvas.getContext("2d")
		if (!ctx) return () => {}

		const TAU = Math.PI * 2
		const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v))
		const mod = (v, n) => ((v % n) + n) % n
		const finite = (v) => typeof v === "number" && Number.isFinite(v)
		const smooth = (a, b, rate, dt) => a + (b - a) * (1 - Math.exp(-rate * dt))

		let seed = 1337
		const random = () => {
			seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
			return seed / 4294967296
		}

		const stars = Array.from({length: 550}, () => ({
			x: random(),
			y: random(),
			depth: random(),
			phase: random() * TAU,
			size: 0.4 + random(),
		}))

		const orbits = [
			{r: 0.25, count: 9, direction: 1, pos: 0, target: 0},
			{r: 0.33, count: 15, direction: -1, pos: 0, target: 0},
			{r: 0.415, count: 24, direction: 1, pos: 0, target: 0},
		]

		const chroma = new Float32Array(12)
		const notes = new Float32Array(12)
		const ripples = []
		const pollen = []
		const sectionWaves = []

		let clock = 0
		let rotation = 0
		let hue = 205,
			hueTarget = 205
		let loud = 0.3,
			slowLoud = 0.3
		let previousWall = performance.now()
		let previousTime
		let lastBeat, lastSection, lastSegment, lastTatum
		let beatCount = 0
		let idleBeat = -1

		const glow = document.createElement("canvas")
		const glowCtx = glow.getContext("2d")

		signal.addEventListener(
			"abort",
			() => {
				pollen.length = ripples.length = sectionWaves.length = 0
				glow.width = glow.height = 1
			},
			{once: true}
		)

		const rippleAt = (position) => {
			let sum = 0
			for (const wave of ripples) {
				const age = clock - wave.time
				let distance = mod(position - wave.origin + 6, 12) - 6
				distance = Math.abs(distance)
				const front = distance - age * 7
				sum += Math.exp((-front * front) / 0.65) * Math.exp(-age * 1.6) * (1 - Math.exp(-age * 25))
			}
			return Math.min(1, sum)
		}

		return (_deltaTime, music) => {
			if (signal.aborted || !canvas.width || !canvas.height) return

			const now = performance.now()
			const wallDt = clamp((now - previousWall) / 1000, 0, 0.05)
			previousWall = now

			const time = music && finite(music.time) ? music.time : undefined
			const seek = time !== undefined && previousTime !== undefined && (time < previousTime || time - previousTime > 0.5)
			const dt = time === undefined || previousTime === undefined ? wallDt : clamp(time - previousTime, 0, 0.05)
			previousTime = time
			clock += dt

			if (seek) {
				ripples.length = pollen.length = sectionWaves.length = 0
				lastBeat = lastSection = lastSegment = lastTatum = undefined
				chroma.fill(0)
			}

			const segment = music?.segment?.current
			const pitches = segment && (segment.pitches || segment.chroma)
			const hasChroma = pitches && pitches.length >= 12
			const demo = !music

			const db = segment && [segment.loudness_max, segment.loudnessMax, segment.loudness, segment.loudness_start, segment.loudnessStart].find(finite)

			const loudTarget = finite(db) ? (db > 0 && db <= 1 ? db : clamp((db + 44) / 40)) : demo ? 0.4 + Math.sin(clock * 0.65) * 0.12 : 0.35

			loud = smooth(loud, loudTarget, loudTarget > loud ? 12 : 4, dt)
			slowLoud = smooth(slowLoud, loud, 1.7, dt)

			let maximum = 1
			if (hasChroma) {
				for (let k = 0; k < 12; k++) {
					if (finite(pitches[k])) maximum = Math.max(maximum, pitches[k])
				}
			}

			for (let k = 0; k < 12; k++) {
				const idle = 0.12 + 0.65 * (0.5 + 0.5 * Math.sin(clock * 0.65 + k * 1.7)) ** 3
				const raw = hasChroma ? (finite(pitches[k]) ? clamp(pitches[k] / maximum) : 0) : demo ? idle : 0.12
				const target = Math.pow(raw, 1.3) * (0.65 + loud * 0.35)
				chroma[k] = smooth(chroma[k], target, target > chroma[k] ? 14 : 4.5, dt)
			}

			for (let k = 0; k < 12; k++) {
				notes[k] = clamp(chroma[(k * 7) % 12] * 1.2)
			}

			const order = Array.from({length: 12}, (_, k) => k).sort((a, b) => notes[b] - notes[a])

			const changed = music?.changed || {}
			let beat = !!changed.beat && music?.beat?.current !== lastBeat
			let section = !!changed.section && music?.section?.current !== lastSection
			let segmentChanged = !!changed.segment && segment !== lastSegment
			let tatum = !!changed.tatum && music?.tatum?.current !== lastTatum

			if (beat) lastBeat = music.beat.current
			if (section) lastSection = music.section.current
			if (segmentChanged) lastSegment = segment
			if (tatum) lastTatum = music.tatum.current

			if (demo) {
				const b = Math.floor(clock * 1.8)
				if (b !== idleBeat) {
					idleBeat = b
					beat = true
					segmentChanged = b % 2 === 0
					section = b % 24 === 0
				}
			}

			if (beat) {
				beatCount++
				for (let i = 0; i < orbits.length; i++) {
					orbits[i].target += i === 2 && beatCount % 4 === 0 ? 2 : 1
				}
				ripples.push({time: clock, origin: order[0]})
				if (ripples.length > 6) ripples.shift()
			}

			if (section) {
				hueTarget += 47
				sectionWaves.push({age: 0})
				if (sectionWaves.length > 4) sectionWaves.shift()
			}

			while (ripples.length && clock - ripples[0].time > 2.5) {
				ripples.shift()
			}

			hue = smooth(hue, hueTarget, 0.65, dt)
			rotation += dt * (0.06 + slowLoud * 0.075)
			for (const orbit of orbits) {
				orbit.pos = smooth(orbit.pos, orbit.target, 7, dt)
			}

			const w = canvas.width,
				h = canvas.height
			const S = Math.min(w, h) * 0.94
			const cx = w / 2,
				cy = h / 2
			const pixel = Math.max(0.6, S / 850)
			const tilt = 0.46 + Math.sin(clock * 0.12) * 0.13
			const ct = Math.cos(tilt),
				st = Math.sin(tilt)
			const roll = Math.sin(clock * 0.065) * 0.1
			const cr = Math.cos(roll),
				sr = Math.sin(roll)

			const colour = (k, light, alpha, offset = 0) => `hsla(${mod(hue + k * 30 + offset, 360)},` + `90%,${light}%,${clamp(alpha)})`

			// Perspective projection of a genuinely curved flower.
			const project = (x, y, z = 0) => {
				const yy = y * ct - z * st
				const zz = y * st + z * ct
				const scale = 1.8 / (1.8 - zz)
				return {
					x: cx + (x * cr - yy * sr) * S * scale,
					y: cy + (x * sr + yy * cr) * S * scale,
					z: zz,
					scale,
				}
			}

			const petalPoint = (k, layer, t, side) => {
				const value = notes[k]
				const a = (k / 12) * TAU - Math.PI / 2 + (layer === 0 ? rotation : Math.PI / 12 - rotation * 0.65)
				const scale = layer === 0 ? 1 : 0.68
				const length = (0.09 + value * 0.18) * scale
				const width = (0.022 + value * 0.035) * scale
				const radius = 0.055 + length * t

				const bend = Math.sin(t * Math.PI) * (0.018 + value * 0.025) * Math.sin(clock * 0.45 + k * 0.8 + layer)

				const tangent = side * width * Math.sin(Math.PI * t) + bend
				const z = (layer === 0 ? 1 : -1) * Math.sin(Math.PI * t * 0.85) * (0.018 + value * 0.06) + rippleAt(k) * 0.014 * t * t

				return {
					x: Math.cos(a) * radius - Math.sin(a) * tangent,
					y: Math.sin(a) * radius + Math.cos(a) * tangent,
					z,
				}
			}

			const tips = Array.from({length: 12}, (_, k) => petalPoint(k, 0, 1, 0))

			const spawn = (k, count) => {
				const origin = tips[k]
				for (let i = 0; i < count && pollen.length < 280; i++) {
					const angle = Math.atan2(origin.y, origin.x) + (random() - 0.5) * 0.5
					const speed = 0.025 + random() * 0.045
					pollen.push({
						x: origin.x,
						y: origin.y,
						z: origin.z,
						vx: Math.cos(angle) * speed,
						vy: Math.sin(angle) * speed,
						vz: 0.015 + random() * 0.035,
						life: 1,
						decay: 0.3 + random() * 0.35,
						size: 0.7 + random() * 1.3,
						hue: mod(hue + k * 30, 360),
					})
				}
			}

			if (beat) spawn(order[0], 5)
			if (segmentChanged) {
				for (let i = 0; i < 3; i++) {
					if (notes[order[i]] > 0.2) spawn(order[i], 2)
				}
			}
			if (tatum) spawn(order[0], 1)

			ctx.save()
			ctx.setTransform(1, 0, 0, 1, 0, 0)
			ctx.globalAlpha = 1
			ctx.globalCompositeOperation = "source-over"
			ctx.filter = "none"
			ctx.shadowBlur = 0
			ctx.fillStyle = "#030510"
			ctx.fillRect(0, 0, w, h)
			ctx.lineCap = "round"
			ctx.lineJoin = "round"

			const atmosphere = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 0.68)
			atmosphere.addColorStop(0, colour(0, 19, 0.28))
			atmosphere.addColorStop(0.55, colour(3, 12, 0.15))
			atmosphere.addColorStop(1, "transparent")
			ctx.fillStyle = atmosphere
			ctx.fillRect(0, 0, w, h)

			ctx.globalCompositeOperation = "lighter"

			// Slow sky rotation, lateral travel, and depth-dependent speed.
			const field = Math.hypot(w, h) * 1.25
			const sky = clock * 0.012
			const cs = Math.cos(sky),
				ss = Math.sin(sky)

			for (const star of stars) {
				const x0 = (star.x - 0.5) * field
				const y0 = (star.y - 0.5) * field
				const x = cx + mod(x0 * cs - y0 * ss - clock * S * (0.012 + star.depth * 0.025) + field / 2, field) - field / 2
				const y = cy + mod(x0 * ss + y0 * cs + field / 2, field) - field / 2

				if (x < -5 || x > w + 5 || y < -5 || y > h + 5) continue

				const twinkle = 0.5 + 0.5 * Math.sin(clock * 0.6 + star.phase)
				ctx.strokeStyle = `rgba(190,213,255,${0.08 + twinkle * 0.18 + star.depth * 0.13})`
				ctx.lineWidth = pixel * star.size * (0.5 + star.depth * 0.5)
				ctx.beginPath()
				ctx.moveTo(x, y)
				ctx.lineTo(x + pixel * (0.5 + star.depth * 2), y)
				ctx.stroke()
			}

			const strokePoints = (points, style, width) => {
				if (!points.length) return
				ctx.strokeStyle = style
				ctx.lineWidth = width
				ctx.beginPath()
				ctx.moveTo(points[0].x, points[0].y)
				for (let i = 1; i < points.length; i++) {
					ctx.lineTo(points[i].x, points[i].y)
				}
				ctx.stroke()
			}

			// Quiet outer halo: each short arc belongs to one pitch region.
			for (let n = 0; n < 144; n++) {
				const position = (n / 144) * 12
				const k = Math.floor(position)
				const fraction = position - k
				const mix = fraction * fraction * (3 - 2 * fraction)
				const value = notes[k] * (1 - mix) + notes[(k + 1) % 12] * mix
				const ripple = rippleAt(position)
				const a = (n / 144) * TAU - Math.PI / 2 + rotation

				const r1 = 0.425
				const r2 = r1 + 0.009 + value * 0.045 + ripple * 0.014
				const p = project(Math.cos(a) * r1, Math.sin(a) * r1)
				const q = project(Math.cos(a) * r2, Math.sin(a) * r2)

				strokePoints([p, q], colour(position, 62 + ripple * 18, 0.12 + value * 0.42), pixel * (1.1 + value * 0.8))
			}

			// Orbital beads retain the original beat-stepping behaviour.
			for (let j = 0; j < orbits.length; j++) {
				const orbit = orbits[j]
				const step = TAU / orbit.count
				const base = orbit.direction * (orbit.pos * step + rotation * 0.3)

				const ringPoints = []
				for (let i = 0; i <= 96; i++) {
					const a = (i / 96) * TAU
					ringPoints.push(project(Math.cos(a) * orbit.r, Math.sin(a) * orbit.r, Math.sin(a * 2 + clock * 0.15 + j) * 0.012))
				}
				strokePoints(ringPoints, colour(j * 3, 65, 0.055), pixel * 0.7)

				for (let i = 0; i < orbit.count; i++) {
					const a = base + i * step - Math.PI / 2
					const position = mod(((a + Math.PI / 2 - rotation) / TAU) * 12, 12)
					const value = notes[Math.round(position) % 12]
					const ripple = rippleAt(position)
					const p = project(Math.cos(a) * orbit.r, Math.sin(a) * orbit.r, Math.sin(a * 2 + clock * 0.15 + j) * 0.012)

					ctx.fillStyle = colour(position, 76 + ripple * 10, 0.22 + value * 0.45)
					ctx.beginPath()
					ctx.arc(p.x, p.y, pixel * (1.3 + value * 1.9 + ripple * 1.7) * p.scale, 0, TAU)
					ctx.fill()
				}
			}

			// Draw translucent petals from back to front.
			const petals = []
			for (let layer = 0; layer < 2; layer++) {
				for (let k = 0; k < 12; k++) {
					const middle = petalPoint(k, layer, 0.6, 0)
					petals.push({
						k,
						layer,
						depth: project(middle.x, middle.y, middle.z).z,
					})
				}
			}
			petals.sort((a, b) => a.depth - b.depth)

			for (const petal of petals) {
				const {k, layer} = petal
				const value = notes[k]
				const ripple = rippleAt(k)
				const outline = []

				for (const side of [-1, 1]) {
					for (let i = 0; i <= 22; i++) {
						const t = side === -1 ? i / 22 : 1 - i / 22
						const p = petalPoint(k, layer, t, side)
						outline.push(project(p.x, p.y, p.z))
					}
				}

				const root3 = petalPoint(k, layer, 0, 0)
				const tip3 = petalPoint(k, layer, 1, 0)
				const root = project(root3.x, root3.y, root3.z)
				const tip = project(tip3.x, tip3.y, tip3.z)
				const gradient = ctx.createLinearGradient(root.x, root.y, tip.x, tip.y)
				const offset = layer ? 25 : 0
				gradient.addColorStop(0, colour(k, 40, 0.015, offset))
				gradient.addColorStop(0.55, colour(k, 55, 0.045 + value * 0.1, offset))
				gradient.addColorStop(1, colour(k, 73, 0.1 + value * 0.22 + ripple * 0.08, offset))

				ctx.beginPath()
				ctx.moveTo(outline[0].x, outline[0].y)
				for (let i = 1; i < outline.length; i++) {
					ctx.lineTo(outline[i].x, outline[i].y)
				}
				ctx.closePath()
				ctx.fillStyle = gradient
				ctx.fill()

				ctx.strokeStyle = colour(k, 77, 0.17 + value * 0.48 + ripple * 0.15, offset)
				ctx.lineWidth = pixel * (0.8 + value * 0.6)
				ctx.stroke()

				// Internal ribs reveal curvature like veins in coloured glass.
				for (const side of [-0.58, 0, 0.58]) {
					const vein = []
					for (let i = 0; i <= 22; i++) {
						const p = petalPoint(k, layer, i / 22, side)
						vein.push(project(p.x, p.y, p.z))
					}

					strokePoints(vein, colour(k, 80, 0.07 + value * 0.17, offset), pixel * 0.65)
				}

				// A beat sends a small highlight from root to tip.
				for (const wave of ripples) {
					const age = clock - wave.time
					let distance = Math.abs(k - wave.origin)
					distance = Math.min(distance, 12 - distance)
					const t = (age - distance * 0.035) * 1.8
					if (t <= 0 || t >= 1) continue

					const p3 = petalPoint(k, layer, t, 0)
					const p = project(p3.x, p3.y, p3.z)
					const alpha = Math.sin(t * Math.PI) * (0.3 + value * 0.5)

					ctx.fillStyle = colour(k, 91, alpha)
					ctx.beginPath()
					ctx.arc(p.x, p.y, pixel * (1.3 + value), 0, TAU)
					ctx.fill()
				}
			}

			// The original flowing silhouette, now projected into depth.
			const projectedTips = tips.map((p) => project(p.x, p.y, p.z))

			for (const scale of [1, 1.1, 1.2]) {
				const alpha = scale === 1 ? 0.65 : scale === 1.1 ? 0.2 : 0.08

				for (let k = 0; k < 12; k++) {
					const transform = (p) => ({
						x: cx + (p.x - cx) * scale,
						y: cy + (p.y - cy) * scale,
					})
					const a = transform(projectedTips[(k + 11) % 12])
					const b = transform(projectedTips[k])
					const c = transform(projectedTips[(k + 1) % 12])

					ctx.strokeStyle = colour(k, 77, alpha * (0.35 + notes[k] * 0.65))
					ctx.lineWidth = pixel * (scale === 1 ? 1.5 : 0.7)
					ctx.beginPath()
					ctx.moveTo((a.x + b.x) / 2, (a.y + b.y) / 2)
					ctx.quadraticCurveTo(b.x, b.y, (b.x + c.x) / 2, (b.y + c.y) / 2)
					ctx.stroke()
				}
			}

			// Limit the web to strong notes; let light move along its threads.
			for (let i = 0; i < 5; i++) {
				for (let j = i + 1; j < 5; j++) {
					const ka = order[i],
						kb = order[j]
					const strength = notes[ka] * notes[kb]
					if (strength < 0.13) continue

					const a = projectedTips[ka]
					const b = projectedTips[kb]
					const q = project((tips[ka].x + tips[kb].x) * 0.13, (tips[ka].y + tips[kb].y) * 0.13, 0.08)

					ctx.strokeStyle = colour(ka, 74, strength * 0.2)
					ctx.lineWidth = pixel * 0.7
					ctx.beginPath()
					ctx.moveTo(a.x, a.y)
					ctx.quadraticCurveTo(q.x, q.y, b.x, b.y)
					ctx.stroke()

					const t = mod(clock * 0.3 + i * 0.21 + j * 0.13, 1)
					const u = 1 - t
					const x = u * u * a.x + 2 * u * t * q.x + t * t * b.x
					const y = u * u * a.y + 2 * u * t * q.y + t * t * b.y

					ctx.fillStyle = colour(ka, 90, strength * 0.7)
					ctx.beginPath()
					ctx.arc(x, y, pixel * 1.3, 0, TAU)
					ctx.fill()
				}
			}

			for (let i = sectionWaves.length - 1; i >= 0; i--) {
				const wave = sectionWaves[i]
				wave.age += dt
				if (wave.age > 3) {
					sectionWaves.splice(i, 1)
					continue
				}

				const points = []
				const r = 0.08 + wave.age * 0.15
				for (let k = 0; k <= 96; k++) {
					const a = (k / 96) * TAU
					points.push(project(Math.cos(a) * r, Math.sin(a) * r, -wave.age * 0.025))
				}

				strokePoints(points, colour(6, 75, 0.18 * (1 - wave.age / 3) ** 2), pixel)
			}

			// Pollen rises out of the flower, then drifts left with the system.
			for (let i = pollen.length - 1; i >= 0; i--) {
				const p = pollen[i]
				p.life -= dt * p.decay
				if (p.life <= 0) {
					pollen[i] = pollen[pollen.length - 1]
					pollen.pop()
					continue
				}

				p.x += (p.vx - (1 - p.life) * 0.025) * dt
				p.y += p.vy * dt
				p.z += p.vz * dt
				const q = project(p.x, p.y, p.z)

				ctx.fillStyle = `hsla(${p.hue},90%,80%,${p.life * 0.65})`
				ctx.beginPath()
				ctx.arc(q.x, q.y, pixel * p.size * (0.4 + p.life * 0.6) * q.scale, 0, TAU)
				ctx.fill()
			}

			// A stable luminous seed. Loudness changes light, not its radius.
			const coreRadius = S * 0.055
			const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius)
			core.addColorStop(0, colour(1, 92, 0.35 + slowLoud * 0.25))
			core.addColorStop(0.18, colour(0, 73, 0.2))
			core.addColorStop(0.5, colour(0, 55, 0.08))
			core.addColorStop(1, "transparent")
			ctx.fillStyle = core
			ctx.fillRect(cx - coreRadius, cy - coreRadius, coreRadius * 2, coreRadius * 2)

			for (let k = 0; k < 12; k++) {
				const a = (k / 12) * TAU - rotation * 0.6
				const p = project(Math.cos(a) * 0.045, Math.sin(a) * 0.045, 0.008)
				ctx.fillStyle = colour(k, 86, 0.2 + notes[k] * 0.65)
				ctx.beginPath()
				ctx.arc(p.x, p.y, pixel * (0.8 + notes[k] * 1.1), 0, TAU)
				ctx.fill()
			}

			// Add a soft glow while preserving the sharp glass edges.
			if (glowCtx) {
				const factor = Math.min(0.25, 540 / Math.max(w, h))
				const gw = Math.max(1, Math.round(w * factor))
				const gh = Math.max(1, Math.round(h * factor))

				if (glow.width !== gw || glow.height !== gh) {
					glow.width = gw
					glow.height = gh
				}

				glowCtx.globalCompositeOperation = "copy"
				glowCtx.drawImage(canvas, 0, 0, gw, gh)

				ctx.globalAlpha = 0.24
				ctx.filter = `blur(${Math.max(2, S * 0.004)}px)`
				ctx.drawImage(glow, 0, 0, w, h)
			}

			ctx.restore()
		}
	},
})
