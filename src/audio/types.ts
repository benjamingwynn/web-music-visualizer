import type {AudioTrackerContext} from "./tracker.ts"

export type VisualizationRender = (deltaTime: number, music: undefined | AudioTrackerContext) => void
export type VisualizationWork = (canvas: HTMLCanvasElement, signal: AbortSignal) => VisualizationRender

export type VisualizationInfo = {
	author: string
	name?: string
	description?: string
	gpu?: "webgpu"
	rating?: number
}

export type Visualization = {
	does: VisualizationWork
	info: VisualizationInfo
	url?: string
}
