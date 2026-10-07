<script lang="ts">
	import {onMount, setContext} from "svelte"
	import {MusicCanvas} from "../audio/canvas.ts"
	import Options from "../components/Options.svelte"
	import Queue from "../components/Queue.svelte"
	import MusicLibrary from "../components/MusicLibrary.svelte"
	import type {Analysis} from "musiq"
	import {writable} from "svelte/store"
	import {nowPlayingId, showLibrary} from "./state.ts"
	import NotChromeWarning from "../components/NotChromeWarning.svelte"
	import LoadCode from "../components/LoadCode.svelte"
	import {DEFAULT_ALBUM_ART, HIDE_UI_AFTER} from "./config.ts"
	import {releaseWakeLock, requestWakeLock} from "../util/wakelock.ts"

	const editorFocused = writable(false)
	setContext("editorFocused", editorFocused) //<Writable<boolean>>("editorFocused")

	const showVisualizationUrl = writable<string[]>([])
	setContext("showVisualizationUrl", showVisualizationUrl)

	let canvas: HTMLCanvasElement
	let main: HTMLElement
	let audio: HTMLAudioElement
	let renderScale = devicePixelRatio
	let mouseLastMoved: number = performance.now()
	let hideUi = false
	let nextFrame: number
	let shouldHide = false
	const musicCanvas = new MusicCanvas()
	const musicCanvasError = musicCanvas.error
	$: document.body.style.cursor = hideUi ? "none" : "default"
	const frame = () => {
		hideUi = shouldHide && performance.now() > mouseLastMoved + HIDE_UI_AFTER && !$editorFocused && !$showLibrary
		// console.log("hide ui:", shouldHide, mouseLastMoved, $editorFocused)

		nextFrame = requestAnimationFrame(frame)
	}

	let userLoadList = localStorage.userLoadList ? JSON.parse(localStorage.userLoadList) : []
	$: localStorage.userLoadList = JSON.stringify(userLoadList)
	let loadList: string[]
	$: loadList = [...userLoadList]

	// async fork to go fetch the list of available visualizations dropped in by the build system
	fetch("/list.txt").then(async (f) => {
		loadList = [
			...loadList,
			...(await f.text())
				.trim()
				.split("\n")
				.map((x) => `/visualizations/${x}`),
		]
	})

	let nextSong: () => void
	let prevSong: () => void
	let openFilePicker: () => void
	let pleaseQueueMusic: () => void
	let pleaseClearQueue: () => void
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
		musicCanvas.stop()
		const url = URL.createObjectURL(file)
		audio.src = url
		$nowPlayingId = file.name
		audio.play()
	}

	async function pleaseStopAudio() {
		releaseWakeLock()
		musicCanvas.stop()
		audio.pause()
		audio.src = ""
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

		if (ev.key === "j") {
			ev.preventDefault()
			prevSong()
			return
		}

		if (ev.key === "l") {
			ev.preventDefault()
			nextSong()
			return
		}

		if (ev.key === "c") {
			ev.preventDefault()
			if (musicCanvas.currentVisualization?.url) {
				if ($showVisualizationUrl.includes(musicCanvas.currentVisualization.url)) {
					$showVisualizationUrl = $showVisualizationUrl.filter((x) => x !== musicCanvas.currentVisualization?.url)
				} else {
					$showVisualizationUrl = [musicCanvas.currentVisualization.url]
				}
			}
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

		if (ev.key === "Escape") {
			ev.preventDefault() // otherwise the browser stops loading network resources
			$showLibrary = !$showLibrary
			return
		}
	}
</script>

<NotChromeWarning />

<svelte:window on:resize={onResize} on:mousemove={onMouse} on:keydown={onKey} on:drop|preventDefault on:dragover|preventDefault />

<canvas bind:this={canvas}></canvas>

<div class="dimmer" hidden={hideUi || $showLibrary} />

<div class="error" hidden={!$musicCanvasError}>
	<h1>{$musicCanvasError}</h1>
</div>

<main class:hidden={hideUi} bind:this={main}>
	<div class="player">
		<audio
			bind:this={audio}
			controls
			on:ended={() => nextSong()}
			on:pause={() => {
				releaseWakeLock()
			}}
			on:play={() => {
				requestWakeLock()
			}}
		></audio>
		<button type="button" on:click={prevSong}>PREV</button>
		<button type="button" on:click={nextSong}>NEXT</button>
		<button type="button" on:click={fullscreen}>enter/exit fullscreen (F key)</button>
	</div>

	<!-- <p>editor is focused? {$editorFocused}</p> -->

	<Queue {musicCanvas} {onSelect} {onAnalysis} {onAddToQueue} bind:next={nextSong} bind:previous={prevSong} bind:openFilePicker bind:pleaseQueueMusic {pleaseStopAudio} bind:pleaseClearQueue />

	<Options {musicCanvas} />
</main>
<MusicLibrary {pleaseQueueMusic} {pleaseClearQueue} />

<!-- <CodeEditor url={".temp"} title="h" code="// hello world"></CodeEditor> -->

{#each loadList as url}
	<LoadCode hidden={!$showVisualizationUrl.includes(url)} {url} />
{/each}

<!-- without this image, the browser will unload the default image when it hasn't seen it in a while, needing it to be refetch from disk/network, which can be slow and cause the default album art to lag behind others -->
<img class="preload" src={DEFAULT_ALBUM_ART} alt="preload" />

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
		top: 0;
		bottom: 0;
		left: 0;
		position: fixed;
		background-color: black;
		white-space: pre;
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
	}

	.preload {
		position: fixed;
		top: -1000px;
		left: -1000px;
		opacity: 0;
	}

	.dimmer {
		background-image: radial-gradient(ellipse at bottom left, #00000076, transparent 20%), radial-gradient(ellipse at bottom right, #000000a2, transparent 10%);
		position: fixed;
		z-index: -1;
		top: 0;
		right: 0;
		left: 0;
		bottom: 0;
		display: block;
		opacity: 1;
		transition: opacity 0.15s;
	}

	.dimmer[hidden] {
		opacity: 0;
	}
</style>
