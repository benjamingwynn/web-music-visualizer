import * as mm from "music-metadata"

export async function probe(file: File) {
	const bytes = new Uint8Array(await file.arrayBuffer())
	const rtn = await mm.parseBuffer(bytes)
	return rtn
}
