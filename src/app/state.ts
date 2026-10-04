import {type MusicCollection} from "./musicCollection.ts"
import {writable} from "svelte/store"

export const showLibrary = writable(true)

export const nowPlayingId = writable<string | null>(null)

export const collection = writable<null | MusicCollection>(null)
export const collectionLoadState = writable<null | string>(null)
