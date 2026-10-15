import {describe, it} from "node:test"
import assert from "node:assert/strict"
import {createAudioTracker} from "../src/audio/tracker.ts"

// Minimal fake Analysis: each track is a row of items spaced `step` seconds apart.
// Only `.start`/`.index` are relevant to the tracker algorithm.
const mk = (n: number, step: number) => Array.from({length: n}, (_, i) => ({start: i * step, index: i}))
const analysis = {
	beats: mk(10, 1),
	sections: mk(3, 5),
	tatums: mk(5, 2),
	segments: mk(4, 3),
} as any

describe("AudioTracker", () => {
	// Each case gets its own tracker so recovered state never leaks between them.
	const newTracker = () => createAudioTracker(analysis)
	const at = (t: ReturnType<typeof createAudioTracker>, time: number) => {
		const c = t(time)
		return {
			beat: c.beat.current?.index,
			section: c.section.current?.index,
			tatum: c.tatum.current?.index,
			segment: c.segment.current?.index,
			changed: {...c.changed},
		}
	}

	it("advances one beat per frame during normal play", () => {
		const t = newTracker()
		assert.equal(at(t, 1.6).beat, 1)
		assert.equal(at(t, 2.5).beat, 2)
	})

	it("recovers every track on a forward skip (>=2 items)", () => {
		const t = newTracker()
		at(t, 1.6)
		const f = at(t, 6.5)
		assert.equal(f.beat, 6)
		assert.equal(f.section, 1) // step 5
		assert.equal(f.tatum, 3) // step 2
		assert.equal(f.segment, 2) // step 3
		// no drift or repeat after the skip
		assert.equal(at(t, 7.0).beat, 7)
		assert.equal(at(t, 8.0).beat, 8)
		assert.equal(at(t, 9.0).beat, 9)
	})

	it("recovers moments on a seek backward (points to the past, not the future)", () => {
		const t = newTracker()
		at(t, 9.0)
		const b = at(t, 2.3)
		assert.equal(b.beat, 2)
		assert.equal(b.section, 0) // step 5
		assert.equal(b.segment, 0) // step 3
		// next hit after the seek-back lands exactly
		assert.equal(at(t, 3.0).beat, 3)
	})

	it("does nothing within the same beat boundary", () => {
		const t = newTracker()
		at(t, 3.0)
		const n = at(t, 3.1)
		assert.equal(n.changed.beat, false)
		assert.equal(n.beat, 3)
	})

	it("clamps to the last item at end-of-track without off-by-one or crash", () => {
		const t = newTracker()
		const e = at(t, 999)
		assert.equal(e.beat, 9)
		assert.equal(e.segment, 3)
		assert.equal(e.section, 2)
	})
})
