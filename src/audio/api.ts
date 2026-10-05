import {MusicCanvas as MC} from "./canvas.ts"

type Statics<T> = {[K in keyof T]: T[K]}

/** The public API for registering a visualization. */
export const MusicCanvas = MC as Pick<Statics<typeof MC>, "registerVisualization">
