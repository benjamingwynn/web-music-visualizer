<script lang="ts">
	import {onMount} from "svelte"
	import {MusicCanvas} from "../audio/canvas.ts"
	import Options from "./Options.svelte"
	import Queue from "./Queue.svelte"
	import type {Analysis} from "musiq"
	import QueueItem from "./QueueItem.svelte"

	let canvas: HTMLCanvasElement
	let main: HTMLElement
	let audio: HTMLAudioElement
	let renderScale = devicePixelRatio
	let mouseLastMoved: number = performance.now()
	let hideUi = false
	let nextFrame: number
	let blockHide = false
	const HIDE_UI_AFTER = 2000
	const musicCanvas = new MusicCanvas()
	$: document.body.style.cursor = hideUi ? "none" : "default"
	const frame = () => {
		hideUi = !blockHide && performance.now() > mouseLastMoved + HIDE_UI_AFTER

		nextFrame = requestAnimationFrame(frame)
	}
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

	async function onAnalysis(analysis: Analysis) {
		await musicCanvas.withAnalysis(analysis)
	}

	function onMouse(ev) {
		mouseLastMoved = performance.now()
		blockHide = ev.target !== canvas && ev.target !== main
	}

	function fullscreen() {
		if (document.fullscreenElement) {
			document.exitFullscreen()
		} else {
			document.querySelector("html")?.requestFullscreen()
		}
	}

	function onKey(ev) {
		if (ev.key === "f") {
			ev.preventDefault()
			fullscreen()
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
<main class:hidden={hideUi} bind:this={main}>
	<div class="player">
		<p>this is the player. todo move the prev/next buttons here</p>
		<button type="button" on:click={fullscreen}>enter/exit fullscreen (F key)</button>
		<audio bind:this={audio} controls></audio>
	</div>

	<Queue {musicCanvas} {onSelect} {onAnalysis} />

	<aside>
		<Options {musicCanvas} />
	</aside>
</main>

<style>
	main {
		padding-bottom: 10em;
		transition: opacity 0.3s;
	}

	main.hidden {
		opacity: 0;
	}

	audio,
	input {
		display: block;
	}

	aside {
		position: fixed;
		top: 0;
		right: 0;
		width: 300px;
		overflow-y: auto;
		bottom: 0;
		background: rgba(0, 0, 255, 0.5);
		margin-right: 1em;
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
