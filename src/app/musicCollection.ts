import type {Writable} from "svelte/store"
import {pQueue} from "./pQueue.ts"
import {lazy} from "./lazy.ts"
import {cache} from "./cache.ts"

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export type SongMetadata = {
	title: string
	albumName: string
	albumArt?: string
	artist: string
}

export type Song = {
	meta: Writable<SongMetadata>
	file: FileSystemFileHandle
}

export type MusicCollection = {
	songs: Song[]
	// artists: Record<string, MusicEntry[]>
	// albums: Record<string, MusicEntry[]>
}

const metaQueue = pQueue<SongMetadata>(2)
// const metaCache = new Map<string, SongMetadata>()

export async function clearAllMetadata() {
	;(await cache<SongMetadata>("song-metadata")).clear()
	location.reload()
}

function fileToBase64(file: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => {
			// result is a data URL: "data:<mime>;base64,<data>"
			const url = reader.result as string
			resolve(url.slice(url.indexOf(",") + 1))
		}
		reader.onerror = () => reject(reader.error)
		reader.readAsDataURL(file)
	})
}

async function getMetadataFor(path: string, val: FileSystemFileHandle, inherit?: Partial<SongMetadata>): Promise<SongMetadata> {
	const metaCache = await cache<SongMetadata>("song-metadata")

	console.log("getting metadata for", path)
	// return from cache if available for path
	const cached = metaCache.get(path)
	if (cached) {
		return cached
	}

	console.log("actually getting metadata for", path)

	// otherwise, let's start working out the metadata
	await sleep(1000)

	// todo
	const rtn: SongMetadata = {
		...inherit,
		albumName: "placeholder for " + path,
		artist: "placeholder for " + path,
		title: "placeholder for " + path,
	}
	metaCache.set(path, rtn)
	return rtn
}

const UNKNOWN_SONG: Omit<SongMetadata, "title"> = {albumName: "Unknown Album", artist: "Unknown Artist"}

export async function openMusicCollection(): Promise<MusicCollection> {
	// .
	const rootDir = await showDirectoryPicker({mode: "read", startIn: "music"})

	console.time("walk music collection")
	console.log(rootDir)

	const songs: Song[] = []
	const walking: Promise<void>[] = []

	const walk = async (dirPath: string, dir: FileSystemDirectoryHandle) => {
		let albumArt: null | string = null
		// kinda inefficient but look for album art *first*
		for await (const [key, val] of dir.entries()) {
			if (val.kind === "file" && key === "cover.jpg") {
				const path = dirPath + "/" + key
				console.warn("loading album art from", path)
				const file = await val.getFile()
				const b64 = await fileToBase64(file)
				const url = "data:image/jpeg;base64," + b64
				albumArt = url
			}
		}

		for await (const [key, val] of dir.entries()) {
			const path = dirPath + "/" + key
			// console.log("*", key, val)
			if (val.kind === "directory") {
				// .
				// console.log("*open directory*", path)
				walking.push(walk(path, val))
			} else {
				// only include know file extensions
				const extension = key.split(".").at(-1)
				if (!["mp3", "wav", "mpeg", "flac"].includes(extension ?? "")) {
					continue
				}
				const defaultSong = {...UNKNOWN_SONG, title: key}
				if (albumArt) defaultSong.albumArt = albumArt
				console.warn("set", val, "as", albumArt)
				songs.push({
					file: val,
					meta: lazy(
						defaultSong,
						metaQueue(() => getMetadataFor(path, val, albumArt ? {albumArt} : undefined))
					),
				})
			}
		}
	}

	await walk(".", rootDir)

	await Promise.allSettled(walking)

	const collection: MusicCollection = {
		songs,
	}

	console.timeEnd("walk music collection")
	return collection

	// ...
}
