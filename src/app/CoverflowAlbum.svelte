<script lang="ts">
	import type {Writable} from "svelte/store"
	import type {Song, SongMetadata} from "./musicCollection"
	import {DEFAULT_ALBUM_ART} from "./config"
	import {sleep} from "./sleep"
	import PlayIcon from "./PlayIcon.svelte"
	import {nowPlayingId, showLibrary} from "./state"
	import {b64Cache} from "./b64Cache"

	export let key: string
	export let meta: Writable<SongMetadata>
	export let index: number
	export let startIndex: number
	export let endIndex: number
	export let selectedIndex: number
	export let trackList: Song[]
	export let onClick: (isSelected: boolean, alt: boolean) => Promise<void>
	export let size: number
	export let zooming: boolean

	$: pitchAmount = size * 0.1

	/** browser doesn't like it when we matrix3d hundreds of things so only apply the transform when we're this many out of range */
	const ADDITIONAL_RENDER_RANGE = 3

	$: iAmSelected = index === selectedIndex
	$: inRenderRange = index >= startIndex - ADDITIONAL_RENDER_RANGE && index <= endIndex + ADDITIONAL_RENDER_RANGE
	$: matrix = !inRenderRange || iAmSelected ? "none" : index > selectedIndex ? keystoneLeft(size, size, pitchAmount) : keystoneRight(size, size, pitchAmount)
	$: artwork = $meta.albumArtwork ?? DEFAULT_ALBUM_ART

	// Right edge pinched, left edge fixed.
	// d > 0: top-right moves down d px, bottom-right moves up d px.
	function keystoneRight(w: number, h: number, d: number) {
		const k = h / (h - 2 * d)
		return `matrix3d(${k}, ${(d * k) / w}, 0, ${(2 * d) / (w * (h - 2 * d))},
		0, 1, 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1)`
	}

	// Left edge pinched, right edge fixed.
	// d > 0: top-left moves down d px, bottom-left moves up d px.
	function keystoneLeft(w: number, h: number, d: number) {
		const s = (h - 2 * d) / h
		return `matrix3d(${s}, ${-d / w}, 0, ${(-2 * d) / (h * w)},
			0, ${s}, 0, 0,
			0, 0, 1, 0,
			0, ${d}, 0, 1)`
	}

	let clicked = false

	$: playingThis = $nowPlayingId === null ? false : Boolean(trackList.find((x) => x?.id === $nowPlayingId))
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
	data-key={key}
	data-index={index}
	role="button"
	class="album"
	class:selected={index === selectedIndex}
	class:clicked
	tabindex="0"
	on:click={async (ev) => {
		if (clicked) return
		if (iAmSelected) {
			if (playingThis) {
				// if we're playing this, just close the ui if we click
				$showLibrary = false
				return
			}
			clicked = true
		}
		const timeStarted = Date.now()
		await onClick(iAmSelected, ev.shiftKey)
		if (iAmSelected) {
			const timeTaken = Date.now() - timeStarted
			const extraDelay = Math.max(0, 300 - timeTaken)
			await sleep(extraDelay)
			clicked = false
		}
	}}
>
	{#if inRenderRange}
		<div class="art" style:transform={matrix} class:animate={!zooming}>
			{#if typeof artwork === "number"}
				{#await b64Cache("album-art") then artCache}
					{@const src = artCache.get(artwork)}
					<img alt="artwork" {src} />
					<img class="reflection" alt="" aria-hidden="true" {src} />
				{/await}
			{:else}
				<img alt="artwork" src={artwork} />
				<img class="reflection" alt="" aria-hidden="true" src={artwork} />
			{/if}
		</div>
	{/if}
	<div class="title">
		<div class="badges">
			<PlayIcon hidden={!playingThis} />
		</div>
		<h1>{$meta.albumName}</h1>
		<div></div>
	</div>
	<h2>{$meta.artist}</h2>
</div>

<style>
	.album {
		display: grid;
		scroll-snap-align: center;
		align-self: center;
		transition: transform 0.15s;
		outline: none;
	}

	.alum:focus {
		outline: none;
	}

	.album.selected {
		z-index: 1;
	}

	.album.selected h1,
	.album.selected h2 {
		color: white;
		opacity: 0.95;
	}

	.album.clicked {
		transform: scale(2.5);
	}

	.art {
		position: relative;
		height: var(--size);
		width: var(--size);
		transform-origin: 0 0;
	}

	.art.animate {
		transition: transform 0.3s;
	}

	.art img {
		display: block;
		height: 100%;
		width: 100%;
	}

	.art img.reflection {
		position: absolute;
		top: calc(100% + 1px);
		left: 0;
		transform: scaleY(-1);
		pointer-events: none;
		-webkit-mask-image: linear-gradient(to bottom, transparent 40%, rgba(0, 0, 0, 0.4));
		mask-image: linear-gradient(to bottom, transparent 40%, rgba(0, 0, 0, 0.4));
	}

	.title {
		width: var(--size);
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		margin-top: 0.7em;
	}

	.badges {
		opacity: 0.4;
		display: flex;
		justify-content: end;
		align-items: center;
		font-size: 2em;
		transition: opacity 0.3s;
	}

	.album.selected .badges {
		opacity: 1;
	}

	h1,
	h2 {
		opacity: 0.5;
		transition:
			opacity 0.3s,
			color 0.3s;
		color: grey;
	}

	h1 {
		margin: 0;
		font-size: 2em;
		text-align: center;
		z-index: 1;
	}
	h2 {
		margin: 0;
		font-size: 1.3em;
		text-align: center;
		z-index: 1;
	}
</style>
