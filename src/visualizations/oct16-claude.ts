import {MusicCanvas} from "api"

// ───────────────────────────────────────────────────────────────────────────
//  CHROMA BLOOM III  ·  by Claude Sonnet 5.5
//  12 pitch classes on the circle of fifths → petals, a flowing outline that
//  traces the harmony, and a web between notes that sound together.
//  Calm core (loudness only). The beat lives in small things: beads hop a
//  step (the outer ring takes an extra hop every 4th beat), a ripple travels
//  around the halo popping nodes. Sections slowly crossfade the palette.
// ───────────────────────────────────────────────────────────────────────────

const TAU = Math.PI * 2
const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v))
const mod = (n, m) => ((n % m) + m) % m
const num = (...vals) => {
	for (const v of vals) if (typeof v === "number" && Number.isFinite(v)) return v
	return undefined
}
const rng = (seed) => () => {
	seed = (seed + 0x6d2b79f5) | 0
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const MAX_PARTICLES = 500
const ORBITS = [
	{r: 0.19, n: 9, dir: 1, size: 0.007},
	{r: 0.265, n: 15, dir: -1, size: 0.0055},
	{r: 0.355, n: 24, dir: 1, size: 0.0042},
]

MusicCanvas.registerVisualization("claude-chroma-bloom-3", {
	info: {
		author: "Claude Sonnet 5.5",
		name: "Chroma Bloom III",
		description: "Petals and a flowing outline for the notes, a harmony web, and a beat carried by hopping beads and ripples.",
	},
	does(canvas, signal) {
		const ctx = canvas.getContext("2d")
		if (!ctx) return () => {}

		const rand = rng(1337)
		const stars = Array.from({length: 150}, () => ({
			a: rand() * TAU,
			r: Math.sqrt(rand()),
			z: 0.2 + rand() * 0.8,
			tw: rand() * TAU,
			s: 0.6 + rand() * 1.6,
		}))
		const orbits = ORBITS.map((o) => ({...o, pos: 0, target: 0}))
		const chroma = new Array(12).fill(0) // by pitch class
		const vis = new Array(12).fill(0) // by position on circle of fifths
		const pop = new Array(12).fill(0)
		const tips = Array.from({length: 12}, () => ({x: 0, y: 0}))
		const rings = []
		const parts = []
		const ripples = []

		let clock = 0
		let rot = 0
		let hue = 210
		let hueTarget = 210
		let loud = 0.3
		let loudSlow = 0.3
		let beatCount = 0
		let first = true
		let lastIdleBeat = -1

		const hueAt = (k) => mod(hue + k * 30, 360)

		// total ripple energy at a (fractional) position 0..12 around the circle
		const ripple = (pos) => {
			let sum = 0
			for (const r of ripples) {
				const age = clock - r.t
				let d = Math.abs(pos - r.origin) % 12
				if (d > 6) d = 12 - d
				const x = d - age * 8
				sum += Math.exp(-(x * x) / 1.6) * Math.exp(-age * 1.8)
			}
			return sum
		}

		const spawn = (k, n, speed, S, startR) => {
			for (let i = 0; i < n && parts.length < MAX_PARTICLES; i++) {
				parts.push({
					a: (k / 12) * TAU - Math.PI / 2 + rot + (rand() - 0.5) * 0.35,
					r: startR,
					va: (rand() - 0.5) * 0.5 + 0.12,
					vr: S * (0.04 + rand() * 0.16) * speed,
					life: 1,
					decay: 0.4 + rand() * 0.6,
					size: Math.max(1, S * (0.001 + rand() * 0.0028)),
					hue: mod(hue + k * 30 + (rand() - 0.5) * 24, 360),
				})
			}
		}

		return (deltaTime, music) => {
			// deltaTime might be seconds or milliseconds: handle both
			let dt = deltaTime > 1 ? deltaTime / 1000 : deltaTime
			if (!(dt > 0)) dt = 1 / 60
			dt = Math.min(dt, 0.1)
			clock += dt

			const w = canvas.width
			const h = canvas.height
			if (!w || !h) return
			const S = Math.min(w, h)
			const cx = w / 2
			const cy = h / 2
			const rate = (s) => 1 - Math.exp(-dt * s)

			// ── gather features ────────────────────────────────────────────
			const changed = (music && music.changed) || {}
			let beatNow = !!changed.beat
			let segNow = !!changed.segment
			const tatumNow = !!changed.tatum
			let sectionNow = !!changed.section

			if (!music) {
				const b = Math.floor(clock * 1.8)
				if (b !== lastIdleBeat) {
					lastIdleBeat = b
					beatNow = true
					if (b % 2 === 0) segNow = true
					if (b % 16 === 0) sectionNow = true
				}
			}

			const seg = music && music.segment && music.segment.current
			const pitches = seg && (seg.pitches || seg.chroma)
			const hasChroma = !!pitches && pitches.length >= 12
			let pmax = 1
			if (hasChroma) {
				pmax = 0
				for (let p = 0; p < 12; p++) pmax = Math.max(pmax, pitches[p] || 0)
				if (pmax < 1) pmax = 1
			}
			const db = seg ? num(seg.loudness_max, seg.loudnessMax, seg.loudness, seg.loudness_start, seg.loudnessStart) : undefined
			const loudT = db !== undefined ? clamp((db + 42) / 38) : 0.45 + 0.2 * Math.sin(clock * 0.9)

			loud += (loudT - loud) * (loudT > loud ? rate(12) : rate(4))
			loudSlow += (loud - loudSlow) * rate(2.2)

			for (let p = 0; p < 12; p++) {
				let raw
				if (hasChroma) raw = clamp((pitches[p] || 0) / pmax)
				else {
					const s = Math.sin(clock * 0.7 + p * 1.1) * Math.sin(clock * 0.31 + p * 2.3)
					raw = clamp(0.12 + 0.88 * s * s)
				}
				const target = Math.pow(raw, 1.5) * (0.5 + 0.5 * loud)
				chroma[p] += (target - chroma[p]) * (target > chroma[p] ? rate(16) : rate(5))
			}
			for (let k = 0; k < 12; k++) vis[k] = clamp(chroma[(k * 7) % 12] * 1.3)
			const order = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].sort((a, b) => vis[b] - vis[a])

			// ── events (small and local, nothing flashes) ──────────────────
			if (beatNow) {
				beatCount++
				orbits[0].target += 1
				orbits[1].target += 1
				orbits[2].target += beatCount % 4 === 0 ? 2 : 1
				ripples.push({t: clock, origin: order[0]})
				if (ripples.length > 4) ripples.shift()
				spawn(order[0], 2, 1, S, S * 0.12)
			}
			if (segNow) for (let i = 0; i < 3; i++) spawn(order[i], 2 + Math.round(loud * 3), 0.8, S, S * 0.12)
			if (tatumNow) spawn(order[Math.floor(rand() * 3)], 1, 0.7, S, S * 0.12)
			if (sectionNow) {
				hueTarget += 55
				rings.push({r: S * 0.1, life: 1})
			}
			while (ripples.length && clock - ripples[0].t > 2.5) ripples.shift()

			hueTarget += dt * 3
			hue += (hueTarget - hue) * rate(1.1)
			rot += dt * (0.05 + 0.2 * loud * loud)
			for (const o of orbits) o.pos += (o.target - o.pos) * rate(7)
			for (let k = 0; k < 12; k++) pop[k] = clamp(ripple(k))

			// ── background ─────────────────────────────────────────────────
			ctx.globalCompositeOperation = "source-over"
			ctx.fillStyle = first ? "rgb(3,2,10)" : "rgba(3,2,10,0.16)"
			ctx.fillRect(0, 0, w, h)
			first = false

			ctx.globalCompositeOperation = "lighter"

			// drifting nebula clouds
			for (let i = 0; i < 3; i++) {
				const a = clock * 0.06 + i * 2.1
				const nx = cx + Math.cos(a) * S * 0.25
				const ny = cy + Math.sin(a * 1.3) * S * 0.2
				const ng = ctx.createRadialGradient(nx, ny, 0, nx, ny, S * 0.6)
				ng.addColorStop(0, `hsla(${mod(hue + i * 50, 360)},70%,35%,${0.03 + 0.05 * loudSlow})`)
				ng.addColorStop(1, `hsla(${mod(hue + i * 50, 360)},70%,20%,0)`)
				ctx.fillStyle = ng
				ctx.fillRect(0, 0, w, h)
			}

			// stars
			for (const st of stars) {
				const a = st.a + rot * 0.05 * st.z
				const r = st.r * S * 0.95
				const tw = 0.5 + 0.5 * Math.sin(clock * (1 + st.z * 2) + st.tw)
				ctx.fillStyle = `hsla(${mod(hue + st.r * 120, 360)},60%,80%,${0.1 + 0.4 * tw * (0.4 + loudSlow)})`
				const sz = Math.max(1, S * 0.0016 * st.s)
				ctx.fillRect(cx + Math.cos(a) * r, cy + Math.sin(a) * r, sz, sz)
			}

			// ── halo: smooth chroma ring with travelling beat ripple ───────
			const N = 144
			ctx.lineCap = "round"
			ctx.lineWidth = Math.max(1, S * 0.004)
			for (let n = 0; n < N; n++) {
				const pos = (n / N) * 12
				const i0 = Math.floor(pos) % 12
				const f = pos - Math.floor(pos)
				const c = (1 - Math.cos(f * Math.PI)) / 2
				const v = vis[i0] * (1 - c) + vis[(i0 + 1) % 12] * c
				const rp = Math.min(1, ripple(pos))
				const ang = (n / N) * TAU - Math.PI / 2 + rot * 0.5
				const r1 = S * 0.405
				const r2 = r1 + S * (0.012 + 0.07 * v + 0.02 * rp)
				const ca = Math.cos(ang)
				const sa = Math.sin(ang)
				ctx.strokeStyle = `hsla(${mod(hue + pos * 30, 360)},90%,${55 + 20 * v + 12 * rp}%,${0.22 + 0.55 * v + 0.2 * rp})`
				ctx.beginPath()
				ctx.moveTo(cx + ca * r1, cy + sa * r1)
				ctx.lineTo(cx + ca * r2, cy + sa * r2)
				ctx.stroke()
			}

			// section progress arc
			const sp = music && Number.isFinite(music.sectionPhase) ? music.sectionPhase : (clock % 30) / 30
			ctx.lineWidth = Math.max(1, S * 0.003)
			ctx.strokeStyle = `hsla(${mod(hue + 180, 360)},80%,70%,0.5)`
			ctx.beginPath()
			ctx.arc(cx, cy, S * 0.495, -Math.PI / 2, -Math.PI / 2 + clamp(sp) * TAU)
			ctx.stroke()

			// ── petals (two counter-rotating layers) ───────────────────────
			const r0 = S * 0.07
			for (let layer = 0; layer < 2; layer++) {
				const off = layer === 0 ? rot : Math.PI / 12 - rot * 0.7
				const scale = layer === 0 ? 1 : 0.62
				for (let k = 0; k < 12; k++) {
					const v = vis[k]
					const len = S * (0.05 + 0.2 * v) * scale
					const wid = S * (0.02 + 0.045 * v) * scale
					const ang = (k / 12) * TAU - Math.PI / 2 + off
					if (layer === 0) {
						tips[k].x = cx + Math.cos(ang) * (r0 + len)
						tips[k].y = cy + Math.sin(ang) * (r0 + len)
					}
					const hh = layer === 0 ? hueAt(k) : mod(hueAt(k) + 40, 360)
					ctx.save()
					ctx.translate(cx, cy)
					ctx.rotate(ang)
					const g = ctx.createLinearGradient(r0, 0, r0 + len, 0)
					g.addColorStop(0, `hsla(${hh},90%,45%,0)`)
					g.addColorStop(1, `hsla(${hh},95%,65%,${(layer === 0 ? 0.5 : 0.36) * (0.3 + v)})`)
					ctx.fillStyle = g
					ctx.strokeStyle = `hsla(${hh},100%,78%,${0.14 + 0.45 * v})`
					ctx.lineWidth = Math.max(1, S * 0.0015)
					ctx.beginPath()
					ctx.moveTo(r0, 0)
					ctx.bezierCurveTo(r0 + len * 0.3, -wid, r0 + len * 0.75, -wid * 0.8, r0 + len, 0)
					ctx.bezierCurveTo(r0 + len * 0.75, wid * 0.8, r0 + len * 0.3, wid, r0, 0)
					ctx.fill()
					ctx.stroke()
					ctx.restore()
				}
			}

			// ── flowing outline through the petal tips (+ two echoes) ──────
			const P = (t, s) => [cx + (t.x - cx) * s, cy + (t.y - cy) * s]
			const outline = (s, alpha, lw, fillIt) => {
				if (fillIt) {
					ctx.beginPath()
					for (let k = 0; k < 12; k++) {
						const a = P(tips[(k + 11) % 12], s)
						const b = P(tips[k], s)
						const c = P(tips[(k + 1) % 12], s)
						const sx = (a[0] + b[0]) / 2
						const sy = (a[1] + b[1]) / 2
						if (k === 0) ctx.moveTo(sx, sy)
						ctx.quadraticCurveTo(b[0], b[1], (b[0] + c[0]) / 2, (b[1] + c[1]) / 2)
					}
					ctx.closePath()
					ctx.fillStyle = `hsla(${hue},90%,60%,${0.04 + 0.06 * loudSlow})`
					ctx.fill()
				}
				ctx.lineWidth = lw
				for (let k = 0; k < 12; k++) {
					const a = P(tips[(k + 11) % 12], s)
					const b = P(tips[k], s)
					const c = P(tips[(k + 1) % 12], s)
					ctx.strokeStyle = `hsla(${hueAt(k)},95%,72%,${alpha * (0.4 + 0.6 * vis[k])})`
					ctx.beginPath()
					ctx.moveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
					ctx.quadraticCurveTo(b[0], b[1], (b[0] + c[0]) / 2, (b[1] + c[1]) / 2)
					ctx.stroke()
				}
			}
			outline(1, 0.55, Math.max(1, S * 0.006), true) // soft glow pass
			outline(1, 0.95, Math.max(1, S * 0.002), false) // crisp pass
			outline(1.12, 0.3, Math.max(1, S * 0.0015), false)
			outline(1.24, 0.14, Math.max(1, S * 0.0012), false)

			// ── harmony web ────────────────────────────────────────────────
			ctx.lineWidth = Math.max(1, S * 0.0012)
			for (let i = 0; i < 12; i++) {
				for (let j = i + 1; j < 12; j++) {
					const pr = vis[i] * vis[j]
					if (pr < 0.16) continue
					const a = tips[i]
					const b = tips[j]
					const qx = cx + ((a.x + b.x) / 2 - cx) * 0.22
					const qy = cy + ((a.y + b.y) / 2 - cy) * 0.22
					ctx.strokeStyle = `hsla(${hueAt(i)},90%,70%,${Math.min(0.4, pr * 0.45)})`
					ctx.beginPath()
					ctx.moveTo(a.x, a.y)
					ctx.quadraticCurveTo(qx, qy, b.x, b.y)
					ctx.stroke()
				}
			}

			// ── orbiting beads: hop one step on every beat ─────────────────
			for (const ob of orbits) {
				const R = S * ob.r
				const step = TAU / ob.n
				const base = ob.dir * (ob.pos * step + rot * 0.3)
				for (let i = 0; i < ob.n; i++) {
					const ang = base + i * step - Math.PI / 2
					const pos = mod(((ang + Math.PI / 2 - rot) / TAU) * 12, 12)
					const v = vis[Math.round(pos) % 12]
					const rp = Math.min(1, ripple(pos))
					const sz = Math.max(1, S * ob.size * (0.6 + 0.8 * v + 0.9 * rp))
					ctx.fillStyle = `hsla(${mod(hue + pos * 30, 360)},90%,${65 + 15 * rp}%,${0.2 + 0.5 * v + 0.3 * rp})`
					ctx.beginPath()
					ctx.arc(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R, sz, 0, TAU)
					ctx.fill()
				}
			}

			// ── petal-tip nodes (popped by the ripple) ─────────────────────
			for (let k = 0; k < 12; k++) {
				const sz = S * 0.005 * (0.7 + vis[k] + 1.2 * pop[k])
				ctx.fillStyle = `hsla(${hueAt(k)},100%,80%,${0.35 + 0.5 * vis[k] + 0.15 * pop[k]})`
				ctx.beginPath()
				ctx.arc(tips[k].x, tips[k].y, Math.max(1, sz), 0, TAU)
				ctx.fill()
			}

			// ── slow section waves ─────────────────────────────────────────
			for (let i = rings.length - 1; i >= 0; i--) {
				const g = rings[i]
				g.life -= dt * 0.3
				if (g.life <= 0) {
					rings.splice(i, 1)
					continue
				}
				g.r += dt * S * 0.22
				ctx.lineWidth = Math.max(1, S * 0.003)
				ctx.strokeStyle = `hsla(${mod(hue + 180, 360)},80%,75%,${g.life * 0.35})`
				ctx.beginPath()
				ctx.arc(cx, cy, g.r, 0, TAU)
				ctx.stroke()
			}

			// ── sparks ─────────────────────────────────────────────────────
			for (let i = parts.length - 1; i >= 0; i--) {
				const p = parts[i]
				p.life -= dt * p.decay
				if (p.life <= 0) {
					parts[i] = parts[parts.length - 1]
					parts.pop()
					continue
				}
				p.r += p.vr * dt
				p.vr *= Math.exp(-dt * 0.35)
				p.a += p.va * dt
				ctx.fillStyle = `hsla(${p.hue},95%,70%,${p.life * 0.8})`
				ctx.beginPath()
				ctx.arc(cx + Math.cos(p.a) * p.r, cy + Math.sin(p.a) * p.r, p.size * (0.4 + p.life), 0, TAU)
				ctx.fill()
			}

			// ── calm core: breathes with smoothed loudness only ────────────
			const cr = S * (0.045 + 0.03 * loudSlow)
			const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr * 2.4)
			core.addColorStop(0, `hsla(${mod(hue + 30, 360)},80%,75%,0.5)`)
			core.addColorStop(0.3, `hsla(${hue},90%,55%,0.2)`)
			core.addColorStop(1, `hsla(${hue},90%,40%,0)`)
			ctx.fillStyle = core
			ctx.beginPath()
			ctx.arc(cx, cy, cr * 2.4, 0, TAU)
			ctx.fill()

			// pitch clock: 12 dots around the core show which notes sound
			for (let k = 0; k < 12; k++) {
				const ang = (k / 12) * TAU - Math.PI / 2 - rot * 0.7
				ctx.fillStyle = `hsla(${hueAt(k)},95%,75%,${0.2 + 0.7 * vis[k]})`
				ctx.beginPath()
				ctx.arc(cx + Math.cos(ang) * cr * 1.7, cy + Math.sin(ang) * cr * 1.7, Math.max(1, S * 0.003 * (0.6 + vis[k])), 0, TAU)
				ctx.fill()
			}

			ctx.globalCompositeOperation = "source-over"
		}
	},
})
