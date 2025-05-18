<script lang="ts">
	import {onMount} from "svelte"
	import {MusicCanvas} from "../audio/canvas.ts"
	import Options from "./Options.svelte"
	import {loadMusiq} from "../audio/musiq.ts"

	let canvas: HTMLCanvasElement
	let audio: HTMLAudioElement
	const musicCanvas = new MusicCanvas()
	onMount(() => {
		musicCanvas.mount(canvas, audio)
		console.log(">>>", musicCanvas)
	})

	let loading: "deps" | "ml" | "file" | null = null

	async function selectFile(file: File) {
		musicCanvas.onNewAudioPlaying()
		loading = "deps"
		const musiq = await loadMusiq()

		loading = "file"
		const url = URL.createObjectURL(file)
		audio.src = url
		audio.play()

		const arrayBuffer = await file.arrayBuffer()

		loading = "ml"
		await musicCanvas.onNewAudio(musiq, arrayBuffer)
		loading = null
	}
</script>

<main>
	<input
		type="file"
		on:change={async (event) => {
			const file = event.target.files[0]
			if (!file) return
			await selectFile(file)
		}}
	/>
	<audio bind:this={audio} controls></audio>
	<canvas bind:this={canvas} width={800} height={600}></canvas>

	<h1>loading={loading}</h1>
	{#if loading}
		<progress />
	{/if}

	<Options {musicCanvas} />
</main>

<style>
	audio,
	input {
		display: block;
	}
</style>
