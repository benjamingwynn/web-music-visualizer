<script lang="ts">
	import {onMount, setContext} from "svelte"
	import {MusicCanvas} from "../audio/canvas.ts"
	import Options from "./Options.svelte"
	import Queue from "./Queue.svelte"
	import MusicLibrary from "./MusicLibrary.svelte"
	import type {Analysis} from "musiq"
	import {writable} from "svelte/store"
	import {nowPlayingId, showLibrary} from "./state.ts"
	import QueueItem from "./QueueItem.svelte"
	import NotChromeWarning from "./NotChromeWarning.svelte"
	import CodeEditor from "./CodeEditor.svelte"
	import LoadCode from "./LoadCode.svelte"
	import {DEFAULT_ALBUM_ART} from "./config.ts"

	const DEFAULT_LOAD_LIST = [
		// .
		"/visualizations/dotsAndLines.ts",
		"/visualizations/growths.ts",
		"/visualizations/needles.ts",
		"/visualizations/particleSymphony.ts",
		"/visualizations/ps1.ts",
		"/visualizations/sonicBloom.ts",
		"/visualizations/vortex.ts",
		"/visualizations/chart.ts",
		"/visualizations/debug.ts",
	]

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
	const HIDE_UI_AFTER = 2000
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
	$: loadList = [...DEFAULT_LOAD_LIST, ...userLoadList]

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
			$showLibrary = !$showLibrary
			return
		}
	}
</script>

<NotChromeWarning />

<svelte:window on:resize={onResize} on:mousemove={onMouse} on:keydown={onKey} on:drop|preventDefault on:dragover|preventDefault />

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

	<h1>playing={$nowPlayingId}</h1>

	<MusicLibrary {pleaseQueueMusic} {pleaseClearQueue} />

	<Queue {musicCanvas} {onSelect} {onAnalysis} {onAddToQueue} bind:next={nextSong} bind:previous={prevSong} bind:openFilePicker bind:pleaseQueueMusic {pleaseStopAudio} bind:pleaseClearQueue />

	<Options {musicCanvas} />
</main>

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

	.preload {
		position: fixed;
		top: -1000px;
		left: -1000px;
		opacity: 0;
	}
</style>
