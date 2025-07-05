import type {Analysis, DetectedBeat, DetectedSection, DetectedSegment, PositionEstimate} from "musiq"
import {createAudioTracker, type AudioTracker, type AudioTrackerContext} from "./tracker.ts"
export {type AudioTrackerContext}
import {writable} from "svelte/store"
export type {DetectedBeat, DetectedSection, DetectedSegment, PositionEstimate}
//

type VisualizationRender = (deltaTime: number, music: undefined | AudioTrackerContext) => void
type VisualizationWork = (canvas: HTMLCanvasElement, signal: AbortSignal) => VisualizationRender

type VisualizationInfo = {
	author: string
	name?: string
	description?: string
	gpu?: "webgpu"
}

type Visualization = {
	does: VisualizationWork
	info: VisualizationInfo
}

export class MusicCanvas {
	public currentVisualizationId!: string
	public currentVisualizationIdStore = writable<string>()
	private currentVisualization?: Visualization
	private currentVisualizationRender?: VisualizationRender
	private audioTracker?: AudioTracker
	public static registeredVisualizations = new Map<string, Visualization>()
	public static registeredVisualizationsStore = writable<[string, Visualization][]>()
	private lastFrameTime: number = performance.now()
	private nextFrame?: number
	private canvas?: HTMLCanvasElement
	private audio?: HTMLAudioElement

	public error = writable<string | null>(null)
	private currentAbort?: AbortController

	constructor() {
		MusicCanvas.constructed.add(this)
	}

	public mount(canvas: HTMLCanvasElement, audio: HTMLAudioElement) {
		this.canvas = canvas
		this.audio = audio

		// start first visualization
		this.startVisualization([...MusicCanvas.registeredVisualizations.keys()][0])
	}

	public onNewAudioPlaying() {
		delete this.audioTracker
	}

	public async withAnalysis(analysis: Analysis) {
		this.audioTracker = createAudioTracker(analysis)
	}

	private onFrame = () => {
		const now = performance.now()
		const delta = now - this.lastFrameTime
		this.lastFrameTime = now
		// .

		if (this.currentVisualizationRender) {
			const music = this.audioTracker && this.audio ? this.audioTracker(this.audio.currentTime) : undefined
			try {
				this.currentVisualizationRender(delta, music)
				this.error.set(null)
			} catch (err) {
				this.error.set("Cannot draw due to an error.")
				console.error("[draw error]", err)
			}
		}

		// queue new frame
		this.nextFrame = requestAnimationFrame(this.onFrame)
	}

	public startVisualization(id: string) {
		//
		if (!this.canvas) {
			throw new Error("the canvas is not mounted")
		}
		const v = MusicCanvas.registeredVisualizations.get(id)
		if (!v) throw new Error("not found")
		if (this.currentAbort) {
			this.currentAbort.abort(new Error("The visualization is changing"))
		}
		this.currentVisualizationId = id
		this.currentVisualizationIdStore.set(id)
		this.currentVisualization = v
		const box = this.canvas.getBoundingClientRect()
		this.canvas.removeAttribute("style")
		this.canvas.width = box.width // <- resets context
		this.canvas.height = box.height
		try {
			const abort = new AbortController()
			const drawFn = v.does(this.canvas, abort.signal)
			this.currentAbort = abort
			this.currentVisualizationRender = drawFn
			this.error.set(null)
		} catch (err) {
			console.error("[init error]", err)
			this.error.set("Cannot initialize due to an error.")
			return
		}

		if (this.nextFrame) cancelAnimationFrame(this.nextFrame)
		this.nextFrame = requestAnimationFrame(this.onFrame)
		this.error.set(null)
	}

	public dispose() {
		if (this.nextFrame) cancelAnimationFrame(this.nextFrame)
		MusicCanvas.constructed.delete(this)
	}

	private static constructed = new Set<MusicCanvas>()

	public static registerVisualization(id: string, visualization: Visualization) {
		MusicCanvas.registeredVisualizations.set(id, visualization)
		MusicCanvas.registeredVisualizationsStore.update(() => {
			const rtn = [...MusicCanvas.registeredVisualizations.entries()]
			return rtn
		})

		// restart the visualization if its re-registered
		for (const canvas of MusicCanvas.constructed) {
			if (canvas.currentVisualizationId === id) {
				canvas.startVisualization(id)
			}
		}
	}
}

window.MusicCanvas = MusicCanvas

// register the debug visualization
MusicCanvas.registerVisualization("debug", {
	info: {
		name: "Debug Visualization",
		author: "benjamin",
		description: "tests the functionality of registering a visualization",
	},
	does: (canvas) => {
		// do setup here
		const ctx = canvas.getContext("2d")
		if (!ctx) throw new Error("Could not create 2D canvas context")
		console.log("did setup")

		return (dT, music) => {
			// draw stuff here
			ctx.clearRect(0, 0, canvas.width, canvas.height)
			ctx.fillStyle = "seagreen"

			const cX = canvas.width / 2
			const cY = canvas.height / 2

			{
				const s = Math.floor(canvas.width * 0.1)
				ctx.font = s + "px monospace"
				// todo: pull from project package json
				const t = "v2507"
				const w = ctx.measureText(t)
				ctx.fillText(t, cX - w.width / 2, cY + w.fontBoundingBoxDescent)
			}

			if (!music) {
				ctx.fillStyle = "orange"
				const s = Math.floor(canvas.width * 0.02)
				ctx.font = s + "px monospace"
				const t = "add music here"
				const x = canvas.width / 3
				const w = ctx.measureText(t)
				ctx.fillText(t, x - w.width, canvas.height - w.fontBoundingBoxDescent * 16)
			}

			{
				ctx.fillStyle = music ? "orange" : "seagreen"
				const s = Math.floor(canvas.width * 0.02)
				ctx.font = s + "px monospace"
				const t = "pick visual here"
				const x = (canvas.width / 6) * 5
				const w = ctx.measureText(t)
				ctx.fillText(t, x - w.width, canvas.height - w.fontBoundingBoxDescent * 16)
			}
		}
	},
})

import("../visualizations/index.ts")
