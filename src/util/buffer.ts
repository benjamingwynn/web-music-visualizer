export function fileToBase64(file: Blob): Promise<string> {
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

export function uint8ArrayToBase64(bytes: Uint8Array<ArrayBufferLike>) {
	// Browser: build a binary string in chunks, then btoa it
	const CHUNK_SIZE = 0x8000 // 32,768 — avoids "Maximum call stack size exceeded"
	let binary = ""
	for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
		binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK_SIZE))
	}
	return btoa(binary)
}
