<script lang="ts">
	import {onMount, setContext} from "svelte"
	import {MusicCanvas} from "../audio/canvas.ts"
	import Options from "./Options.svelte"
	import Queue from "./Queue.svelte"
	import type {Analysis} from "musiq"
	import {writable} from "svelte/store"
	import QueueItem from "./QueueItem.svelte"

	const editorFocused = writable(false)
	setContext("editorFocused", editorFocused) //<Writable<boolean>>("editorFocused")

	let canvas: HTMLCanvasElement
	let main: HTMLElement
	let audio: HTMLAudioElement
	let renderScale = devicePixelRatio
	let mouseLastMoved: number = performance.now()
	let hideUi = false
	let nextFrame: number
	let shouldHide = false
	const HIDE_UI_AFTER = 2000
	const musicCanvas = new MusicCanvas()
	const musicCanvasError = musicCanvas.error
	$: document.body.style.cursor = hideUi ? "none" : "default"
	const frame = () => {
		hideUi = shouldHide && performance.now() > mouseLastMoved + HIDE_UI_AFTER && !$editorFocused
		// console.log("hide ui:", shouldHide, mouseLastMoved, $editorFocused)

		nextFrame = requestAnimationFrame(frame)
	}

	let nextSong: () => void
	let prevSong: () => void
	let openFilePicker: () => void
	onMount(() => {
		canvas.height = window.innerHeight * renderScale
		canvas.width = window.innerWidth * renderScale
		musicCanvas.mount(canvas, audio)
		console.log(">>>", musicCanvas)
		nextFrame = requestAnimationFrame(frame)
	})

	function onResize() {
		canvas.height = window.innerHeight * renderScale
		canvas.width = window.innerWidth * renderScale
	}

	async function onSelect(file: File) {
		musicCanvas.onNewAudioPlaying()
		const url = URL.createObjectURL(file)
		audio.src = url
		audio.play()
	}

	function onAddToQueue() {
		requestAnimationFrame(() => {
			main.scrollTo({behavior: "smooth", top: main.scrollHeight})
		})
	}

	async function onAnalysis(analysis: Analysis) {
		await musicCanvas.withAnalysis(analysis)
	}

	function onMouse(ev) {
		mouseLastMoved = performance.now()
		// console.log(ev.target)
		shouldHide = ev.target === document.body
	}

	function fullscreen() {
		if (document.fullscreenElement) {
			document.exitFullscreen()
		} else {
			document.querySelector("html")?.requestFullscreen()
		}
	}

	function onKey(ev) {
		if ($editorFocused) {
			// if editor is focused literally ignore everything
			return
		}

		if (ev.key === "f") {
			ev.preventDefault()
			fullscreen()
			return
		}

		if (ev.key === "o") {
			ev.preventDefault()
			openFilePicker()
			return
		}

		if (ev.key === "k" || ev.key === "Space") {
			ev.preventDefault()
			if (audio.paused) {
				audio.play()
			} else {
				audio.pause()
			}
			return
		}
	}
</script>

<svelte:window on:resize={onResize} on:mousemove={onMouse} on:keydown={onKey} />
<canvas bind:this={canvas}></canvas>

<div class="error" hidden={!$musicCanvasError}>
	<h1>{$musicCanvasError}</h1>
</div>

<main class:hidden={hideUi} bind:this={main}>
	<div class="player">
		<audio bind:this={audio} controls on:ended={() => nextSong()}></audio>
		<button type="button" on:click={prevSong}>PREV</button>
		<button type="button" on:click={nextSong}>NEXT</button>
		<button type="button" on:click={fullscreen}>enter/exit fullscreen (F key)</button>
	</div>

	<!-- <p>editor is focused? {$editorFocused}</p> -->

	<Queue {musicCanvas} {onSelect} {onAnalysis} {onAddToQueue} bind:next={nextSong} bind:previous={prevSong} bind:openFilePicker />

	<Options {musicCanvas} />
</main>

<style>
	:global(html, body) {
		height: 100%;
	}

	:global(body) {
		display: flex;
		flex-flow: column nowrap;
		justify-content: end;
	}

	.error {
		position: fixed;
		background-color: pink;
		color: darkred;
		font-weight: bold;
		border: red solid thin;
	}

	main {
		padding-bottom: 10em;
		transition: opacity 0.3s;
		overflow-y: auto;
		max-width: 300px;
	}

	main.hidden {
		opacity: 0;
	}

	audio,
	input {
		display: block;
	}

	canvas {
		position: fixed;
		width: 100vw;
		height: 100vh;
		z-index: -1;
		top: 0;
		left: 0;
	}

	.player {
		position: fixed;
		bottom: 0;
		left: 0;
		height: 10em;
		background: rgba(0, 255, 0, 0.5);
	}
</style>
