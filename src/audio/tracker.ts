import type {Analysis, DetectedBeat, DetectedSection, DetectedSegment, PositionEstimate} from "musiq"
export class AudioMoment<T> {
	current: T | undefined
	next: T | undefined
	prev: T | undefined
}

export type AudioTrackerContext = {
	changed: {
		beat: boolean
		section: boolean
		tatum: boolean
		segment: boolean
	}
	beat: AudioMoment<DetectedBeat>
	section: AudioMoment<DetectedSection>
	tatum: AudioMoment<PositionEstimate>
	segment: AudioMoment<DetectedSegment>
}

// audio tracker
export function createAudioTracker(analysis: Analysis) {
	console.warn("created audio tracker for:", analysis)
	const beat = new AudioMoment<DetectedBeat>()
	const section = new AudioMoment<DetectedSection>()
	const tatum = new AudioMoment<PositionEstimate>()
	const segment = new AudioMoment<DetectedSegment>()

	let changed = {beat: false, section: false, tatum: false, segment: false}
	let currentIndexes = {beat: -1, section: -1, tatum: -1, segment: -1}
	let lastTime = 0

	const recalculateIndexes = (time: number) => {
		console.warn("hit recalculateIndexes for time", time)
		// todo: optimize by looking forward first instead of looking from the start
		currentIndexes = {beat: -1, section: -1, tatum: -1, segment: -1}

		while (analysis.beats[currentIndexes.beat + 1] && analysis.beats[currentIndexes.beat + 1].start <= time) currentIndexes.beat++
		while (analysis.sections[currentIndexes.section + 1] && analysis.sections[currentIndexes.section + 1].start <= time) currentIndexes.section++
		while (analysis.tatums[currentIndexes.tatum + 1] && analysis.tatums[currentIndexes.tatum + 1].start <= time) currentIndexes.tatum++
		while (analysis.segments[currentIndexes.segment + 1] && analysis.segments[currentIndexes.segment + 1].start <= time) currentIndexes.segment++
		console.log("successful recalculation to time", time, "is", currentIndexes.beat, currentIndexes.section, currentIndexes.tatum, currentIndexes.segment)
	}

	const onAudioChange = (currentTimeInSeconds: number): AudioTrackerContext => {
		// if we're before the beat we hit previously, recalculate
		// if we're after the beat AND we are after the beat after that, recalculate
		// if we're after the beat we expect, hit the beat
		// if we're before the beat we expect and after the beat we did, do nothing

		// we went backwards
		if (currentTimeInSeconds < lastTime) {
			console.log("did we go backwards?")
			recalculateIndexes(currentTimeInSeconds)
			// return onAudioChange(currentTimeInSeconds)
		}
		lastTime = currentTimeInSeconds
		changed = {beat: false, section: false, tatum: false, segment: false}

		const update = (thing: keyof typeof currentIndexes, things: keyof Analysis, ob: AudioMoment<any>): void => {
			const nextThingIndex = currentIndexes[thing] + 1
			const currentThing = analysis[things][currentIndexes[thing]]
			const nextThing = analysis[things][nextThingIndex]
			const nextNextThing = analysis[things][nextThingIndex + 1]

			// we missed the thing
			if (nextNextThing && currentTimeInSeconds >= nextNextThing.start) {
				console.log("missed", thing, "@", nextNextThing.start, "-im", currentTimeInSeconds)
				recalculateIndexes(currentTimeInSeconds)
				changed[thing] = true
				// return update(thing, things, ob)
			}

			// we passed the thing position so hit the thing
			if (nextThing && currentTimeInSeconds >= nextThing.start) {
				changed[thing] = true
				ob.prev = currentThing
				ob.current = nextThing
				ob.next = nextNextThing

				currentIndexes[thing]++
			}
		}

		update("beat", "beats", beat)
		update("section", "sections", section)
		update("tatum", "tatums", tatum)
		update("segment", "segments", segment)

		return {
			changed,
			beat,
			section,
			tatum,
			segment,
		}
	}

	return onAudioChange
}

export type AudioTracker = ReturnType<typeof createAudioTracker>
