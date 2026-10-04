<script lang="ts">
	import type {Writable} from "svelte/store"
	import type {MusicCollection, Song, SongMetadata} from "./musicCollection"
	import {DEFAULT_ALBUM_ART} from "./config"

	export let meta: Writable<SongMetadata>
	// export let transform: null | "left" | "right"
	export let index: number
	export let startIndex: number
	export let endIndex: number
	export let selectedIndex: number
	export let trackList: Song[]

	export let onClick: () => Promise<void>

	export let size

	/** browser doesn't like it when we matrix3d hundreds of things so only apply the transform when we're this many out of range */
	const ADDITIONAL_RENDER_RANGE = 3

	$: inRenderRange = index >= startIndex - ADDITIONAL_RENDER_RANGE && index <= endIndex + ADDITIONAL_RENDER_RANGE
	$: matrix = !inRenderRange || index === selectedIndex ? "none" : "" + (index > selectedIndex ? keystoneLeft(size, size, PITCH_AMOUNT) : keystoneRight(size, size, PITCH_AMOUNT))

	const PITCH_AMOUNT = 60

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
</script>

<div class:selected={index === selectedIndex} style:--size={size + "px"} tabindex="0" on:click={onClick}>
	{#if inRenderRange}
		<img alt="artwork" src={$meta.albumArtwork ?? DEFAULT_ALBUM_ART} style:transform={matrix} />
	{/if}
	<h1>{$meta.albumName}</h1>
	<h2>{$meta.artist}</h2>
</div>

<style>
	div {
		display: grid;
		scroll-snap-align: center;
		align-self: center;
	}

	div.selected h1,
	div.selected h2 {
		opacity: 0.95;
	}

	img {
		height: var(--size);
		width: var(--size);
		/*
			todo: remove box-reflect and replace with a fake image for the reflection
			we can use grid to zero out its box model height
			i tried to do this by modifying the matrix but it resulted in the reflection "jumping around"
		*/
		-webkit-box-reflect: below 1px linear-gradient(to bottom, transparent 40%, rgba(0, 0, 0, 0.4));
		transform-origin: 0 0;
		transition: 0.3s all;
	}

	h1,
	h2 {
		width: var(--size);
		opacity: 0.2;
		transition: 0.3s opacity;
	}

	h1 {
		margin: 0;
		margin-top: 0.7em;
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
