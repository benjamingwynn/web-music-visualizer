export async function sha256(input: ArrayBuffer) {
	const hash = await crypto.subtle.digest("SHA-256", input)

	return Array.from(new Uint8Array(hash))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("")
}
