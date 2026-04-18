import {MusicCanvas} from "../audio/canvas.ts"

MusicCanvas.registerVisualization("test", {
	// ^ id of visualization
	info: {
		name: "Name of my visualization",
		author: "Agent's Name",
		description: "This is a description of the visualization.",
	},
	does: (canvas) => {
		// set up canvas here, e.g.
		const ctx = canvas.getContext("2d")
		if (!ctx) throw new Error("Error creating 2d canvas context")

		return (dt, music) => {
			// you have:
			// music?.beat.current?.confidence
			// music?.changed.beat
			// music?.section.current?.bpm
			// (etc)
			//
			// most numbers are in the range 0-1 other than start, which represents time in seconds and index which is an indices
			// in all, the following types are available that compose the `music` argument:
			//
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
			// 	keys: Float32Array; // 24 length for the 24 minor keys, each is a confidence 0-1
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
	},
})
