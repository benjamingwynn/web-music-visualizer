import type {Analysis, DetectedBeat, DetectedSection, DetectedSegment, PositionEstimate} from "musiq"

export class AudioMoment<T> {
	current: T | undefined
	next: T | undefined
	prev: T | undefined
}

export type AudioTrackerContext = {
	time: number
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
	/** 0..1 progress from the current event to the next one. */
	beatPhase: number
	/** 0..1 progress from the current tatum to the next one. */
	tatumPhase: number
	/** 0..1 progress through the current ~10 Hz analysis segment. */
	segmentPhase: number
	/** 0..1 progress through the current detected section. */
	sectionPhase: number
}

type MomentName = "beat" | "section" | "tatum" | "segment"
type AnalysisListName = "beats" | "sections" | "tatums" | "segments"

const TRACKS: ReadonlyArray<{
	moment: MomentName
	list: AnalysisListName
}> = [
	{moment: "beat", list: "beats"},
	{moment: "section", list: "sections"},
	{moment: "tatum", list: "tatums"},
	{moment: "segment", list: "segments"},
]

function clamp01(value: number): number {
	return Math.max(0, Math.min(1, value))
}

function indexAt<T extends {start: number}>(items: readonly T[], time: number): number {
	let lo = 0
	let hi = items.length - 1
	let found = -1
	while (lo <= hi) {
		const mid = (lo + hi) >> 1
		if ((items[mid]?.start ?? Infinity) <= time) {
			found = mid
			lo = mid + 1
		} else {
			hi = mid - 1
		}
	}
	return found
}

function phaseOf<T extends {start: number}>(moment: AudioMoment<T>, time: number, fallbackDuration = 0): number {
	const current = moment.current
	if (!current) return 0

	let duration = (moment.next?.start ?? NaN) - current.start
	if (!(duration > 0) && fallbackDuration > 0) duration = fallbackDuration
	if (!(duration > 0) && moment.prev) duration = current.start - moment.prev.start
	if (!(duration > 0)) return 0

	return clamp01((time - current.start) / duration)
}

// audio tracker
export function createAudioTracker(analysis: Analysis) {
	const beat = new AudioMoment<DetectedBeat>()
	const section = new AudioMoment<DetectedSection>()
	const tatum = new AudioMoment<PositionEstimate>()
	const segment = new AudioMoment<DetectedSegment>()

	const moments = {beat, section, tatum, segment}
	let changed = {beat: false, section: false, tatum: false, segment: false}
	let currentIndexes = {beat: -1, section: -1, tatum: -1, segment: -1}
	let lastTime = Number.NaN

	const syncMoment = (momentName: MomentName, listName: AnalysisListName) => {
		const list = analysis[listName] as Array<{start: number}>
		const index = currentIndexes[momentName]
		const moment = moments[momentName] as AudioMoment<{start: number}>
		moment.prev = list[index - 1]
		moment.current = list[index]
		moment.next = list[index + 1]
	}

	const recalculateIndexes = (time: number) => {
		for (const {moment, list} of TRACKS) {
			const oldIndex = currentIndexes[moment]
			const nextIndex = indexAt(analysis[list] as Array<{start: number}>, time)
			currentIndexes[moment] = nextIndex
			changed[moment] = oldIndex !== nextIndex
			syncMoment(moment, list)
		}
	}

	const advance = (momentName: MomentName, listName: AnalysisListName, time: number) => {
		const list = analysis[listName] as Array<{start: number}>
		let index = currentIndexes[momentName]
		const oldIndex = index
		while (list[index + 1] && list[index + 1]!.start <= time) index++
		if (index !== oldIndex) {
			currentIndexes[momentName] = index
			changed[momentName] = true
			syncMoment(momentName, listName)
		}
	}

	return (currentTimeInSeconds: number): AudioTrackerContext => {
		const time = Number.isFinite(currentTimeInSeconds) ? Math.max(0, currentTimeInSeconds) : 0
		changed = {beat: false, section: false, tatum: false, segment: false}

		// Seeking, returning from a suspended/background tab, or the first frame:
		// binary-search straight to the correct state instead of replaying thousands
		// of 10 Hz segments or emitting a burst of stale visual events.
		const discontinuity = !Number.isFinite(lastTime) || time < lastTime || time - lastTime > 1
		if (discontinuity) {
			recalculateIndexes(time)
		} else {
			for (const {moment, list} of TRACKS) advance(moment, list, time)
		}
		lastTime = time

		const beatDuration = beat.current?.bpm && beat.current.bpm > 0 ? 60 / beat.current.bpm : 0

		return {
			time,
			changed,
			beat,
			section,
			tatum,
			segment,
			beatPhase: phaseOf(beat, time, beatDuration),
			tatumPhase: phaseOf(tatum, time),
			segmentPhase: phaseOf(segment, time),
			sectionPhase: phaseOf(section, time),
		}
	}
}

export type AudioTracker = ReturnType<typeof createAudioTracker>
