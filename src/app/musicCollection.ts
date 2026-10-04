import {writable, type Writable} from "svelte/store"
import {pQueue} from "./pQueue.ts"
import {lazy} from "./lazy.ts"
import {cache} from "./cache.ts"
import {probe} from "./probe.ts"
import {uint8ArrayToBase64, fileToBase64} from "./buffer.ts"

export type SongMetadata = {
	title: string
	albumName: string
	albumArtwork?: string
	albumArtist?: string
	track: number
	artist: string
}

export type Song = {
	id: string
	meta: Writable<SongMetadata>
	file: FileSystemFileHandle
}

export type MusicCollection = {
	albums: Writable<Record<string, Song[]>>
	songs: Song[]
	// artists: Record<string, MusicEntry[]>
	// albums: Record<string, MusicEntry[]>
}

const metaQueue = pQueue<SongMetadata>(10)
// const metaCache = new Map<string, SongMetadata>()

export async function clearAllMetadata() {
	;(await cache<SongMetadata>("song-metadata")).clear()
	// location.reload()
}

async function getMetadataFor(path: string, f: FileSystemFileHandle, inherit?: Partial<SongMetadata>): Promise<SongMetadata> {
	const metaCache = await cache<SongMetadata>("song-metadata")

	console.log("query metadata for", path)
	// return from cache if available for path
	const cached = metaCache.get(path)
	if (cached) {
		console.log("cache hit for", path)
		return cached
	}

	console.time("metadata probe")

	let biggestImage = inherit?.albumArtwork
	const probed = await probe(await f.getFile())
	for (const picture of probed.common.picture ?? []) {
		const artUrl = `data:${picture.format};base64,${uint8ArrayToBase64(picture.data)}`
		if (!biggestImage || artUrl.length > biggestImage.length) {
			biggestImage = artUrl
			console.log("using embedded artwork")
		}
	}
	const rtn: SongMetadata = {
		...inherit,
		albumName: probed.common.album ?? "Unidentified Album",
		albumArtist: probed.common.albumartist ?? probed.common.artist ?? "Unidentified Artist",
		artist: probed.common.artist ?? "Unidentified Artist",
		title: probed.common.title ?? path,
		track: probed.common.track.no ?? 0,
		// track: probed.common.track.no ?? (probed.common.albumsort ? parseInt(probed.common.albumsort) : null) ?? 0,
	}
	// console.log("[probed]", probed)
	console.log("[track numbering!!]", rtn.albumName, rtn.title, "::", rtn.track)
	console.timeEnd("metadata probe")
	metaCache.set(path, rtn)
	return rtn
}

const UNKNOWN_SONG: Omit<SongMetadata, "title"> = {albumName: "Unknown Album", artist: "Unknown Artist", track: 0}

export async function openMusicCollection(): Promise<MusicCollection> {
	const rootDir = await showDirectoryPicker({mode: "read", startIn: "music"})

	console.time("walk music collection")
	console.log(rootDir)

	let u = 0
	const songs: Song[] = []
	const walking: Promise<void>[] = []
	const _albums = {} as Record<string, Song[]>
	const albums = writable(_albums)

	const walk = async (dirPath: string, dir: FileSystemDirectoryHandle) => {
		let albumArtwork: null | string = null
		// look for sibling album art *first*
		for await (const [key, val] of dir.entries()) {
			if (val.kind === "file" && key === "cover.jpg") {
				const path = dirPath + "/" + key
				console.warn("loading album art from", path)
				const file = await val.getFile()
				const b64 = await fileToBase64(file)
				const url = "data:image/jpeg;base64," + b64
				albumArtwork = url
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
				// only include known file extensions
				const extension = key.split(".").at(-1)
				if (!["mp3", "wav", "flac"].includes(extension ?? "")) {
					continue
				}
				const defaultSong = {...UNKNOWN_SONG, title: key}
				if (albumArtwork) defaultSong.albumArtwork = albumArtwork
				// console.warn("set", val, "as", albumArtwork)
				const song: Song = {
					id: key,
					file: val,
					meta: lazy(
						defaultSong,
						metaQueue(() => getMetadataFor(path, val, albumArtwork ? {albumArtwork} : undefined)),
						(m) => {
							// this all seems a bit hacky?
							_albums[m.albumName] = _albums[m.albumName] ?? []
							if (_albums[m.albumName][m.track]) {
								console.warn("duplicate track detected!! @", m.track, "for", m.title, "on", m.albumName)
								_albums[m.albumName][m.track + 99] = song // ?
							} else {
								_albums[m.albumName][m.track] = song
								console.log("for", m.albumName, "push", m.title, "to spot", m.track)
							}
							// _albums[m.albumName] = _albums[m.albumName].filter((x) => x)
							albums.set(
								// sort before setting, by album name
								Object.fromEntries(Object.entries(_albums).sort(([a], [b]) => a.localeCompare(b)))
							)
							console.log("add to album!", m.albumName, m.track)
						}
					),
				}
				songs.push(song)
			}
		}
	}

	await walk(".", rootDir)

	await Promise.allSettled(walking)

	const collection: MusicCollection = {
		albums,
		songs,
	}

	console.timeEnd("walk music collection")
	return collection
}
