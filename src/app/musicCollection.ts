import {writable, type Writable} from "svelte/store"
import {pQueue} from "./pQueue.ts"
import {lazy} from "./lazy.ts"
import {cache} from "./cache.ts"
import {probe} from "./probe.ts"
import {uint8ArrayToBase64, fileToBase64} from "./buffer.ts"
import {collectionLoadState} from "./state.ts"
import {tick} from "svelte"
import {b64Cache} from "./b64Cache.ts"

export type SongMetadata = {
	title: string
	albumName: string
	albumArtwork?: number
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
	;(await cache<SongMetadata>("b64:album-art")).clear()
	;(await cache<SongMetadata>("song-metadata")).clear()
	// location.reload()
}

async function getMetadataFor(metaCache: Map<string, SongMetadata>, path: string, f: FileSystemFileHandle, inherit?: Partial<SongMetadata>): Promise<SongMetadata> {
	console.log("query metadata for", path)
	collectionLoadState.set('Getting metadata for "' + path.split("/").at(-1) + '"...')
	// return from cache if available for path
	const cached = metaCache.get(path)
	if (cached) {
		console.log("cache hit for", path)
		return cached
	}
	const albumArt = await b64Cache("album-art")

	collectionLoadState.set('Extracting metadata for "' + path.split("/").at(-1) + '"...')
	console.time("metadata probe")

	let biggestImageNumber = inherit?.albumArtwork
	let biggestImage = biggestImageNumber ? albumArt.get(biggestImageNumber) : null
	const probed = await probe(await f.getFile())
	for (const picture of probed.common.picture ?? []) {
		const artUrl = `data:${picture.format};base64,${uint8ArrayToBase64(picture.data)}`
		if (!biggestImage || artUrl.length > biggestImage.length) {
			biggestImage = artUrl
			biggestImageNumber = albumArt.put(artUrl)
			console.log("using embedded artwork")
		}
	}
	const rtn: SongMetadata = {
		...inherit,
		albumArtwork: biggestImageNumber,
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

	// collectionLoadState.set(null) // unset since we're happening async and no more work is happening
	return rtn
}

const UNKNOWN_SONG: Omit<SongMetadata, "title"> = {albumName: "Unknown Album", artist: "Unknown Artist", track: 0}
export async function openMusicCollection(): Promise<MusicCollection> {
	const rootDir = await showDirectoryPicker({mode: "read", startIn: "music"})

	console.time("walk music collection")
	console.log(rootDir)

	const songs: Song[] = []
	const walking: Promise<void>[] = []
	const _albums = {} as Record<string, Song[]>
	const albums = writable(_albums)

	let pending = 0
	let walkDone = false
	const settle = () => {
		if (walkDone && pending === 0) {
			console.warn("** all work done **")
			collectionLoadState.set(null)
		}
	}

	collectionLoadState.set("Loading cached library data...")
	await tick() // ^ let this always update
	const metaCache = await cache<SongMetadata>("song-metadata")
	const albumArt = await b64Cache("album-art")

	const walk = async (dirPath: string, dir: FileSystemDirectoryHandle) => {
		let albumArtwork: null | number = null

		collectionLoadState.set('Searching "' + dirPath + '" for music and cover art...')
		// look for sibling album art *first*
		for await (const [key, val] of dir.entries()) {
			if (val.kind === "file" && key === "cover.jpg") {
				const path = dirPath + "/" + key
				console.warn("loading album art from", path)
				collectionLoadState.set('Loading cover art from "' + dirPath + '"...')
				const file = await val.getFile()
				const b64 = await fileToBase64(file)
				const url = "data:image/jpeg;base64," + b64
				albumArtwork = albumArt.put(url)
			}
		}

		for await (const [key, val] of dir.entries()) {
			const path = dirPath + "/" + key
			// console.log("*", key, val)
			if (val.kind === "directory") {
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

				pending++
				const metaPromise = metaQueue(() => getMetadataFor(metaCache, path, val, albumArtwork ? {albumArtwork} : undefined))
				metaPromise.catch(() => {
					pending--
					settle()
				})

				const song: Song = {
					id: key,
					file: val,
					meta: lazy(defaultSong, metaPromise, (m) => {
						collectionLoadState.set('Adding "' + m.title + '" to album...')

						const k = m.albumArtist + "::" + m.albumName
						_albums[k] = _albums[k] ?? []
						// having the album be an array with holes in it kinda sucks and is hacky
						if (_albums[k][m.track]) {
							// this is a bit hacky
							console.warn("duplicate track detected!! @", m.track, "for", m.title, "on", m.albumName)
							_albums[k][m.track + 99] = song // ?
						} else {
							_albums[k][m.track] = song
							console.log("for", m.albumName, "push", m.title, "to spot", m.track)
						}
						albums.set(Object.fromEntries(Object.entries(_albums).sort(([a], [b]) => a.localeCompare(b))))
						console.log("add to album!", m.albumName, m.track)

						pending--
						settle()
					}),
				}
				collectionLoadState.set('Found song "' + key + '"')
				songs.push(song)
			}
		}
	}

	await walk(".", rootDir)

	await Promise.allSettled(walking)

	walkDone = true
	settle()

	const collection: MusicCollection = {
		albums,
		songs,
	}

	console.timeEnd("walk music collection")
	return collection
}
