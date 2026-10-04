import {writable} from "svelte/store"

export const showLibrary = writable(false)

export const nowPlayingId = writable<string | null>(null)
