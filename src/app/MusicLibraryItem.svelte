<script lang="ts">
	import type {Writable} from "svelte/store"
	import type {SongMetadata} from "./musicCollection"
	import {probe} from "./probe"
	import {showLibrary} from "./state"
	import {DEFAULT_ALBUM_ART} from "./config"

	export let metadata: Writable<SongMetadata>
	export let handle: FileSystemFileHandle
	export let pleaseQueueMusic: (files: File[]) => void

	$: artist = $metadata.artist
	$: title = $metadata.title
</script>

<button
	class="item"
	style:--size={120}
	type="button"
	on:click={async () => {
		const file = await handle.getFile()
		pleaseQueueMusic([file])
		$showLibrary = false
	}}
>
	<img alt="artwork" src={$metadata.albumArtwork ?? DEFAULT_ALBUM_ART} />
	<h5>{title}</h5>
	<h6>{$metadata.albumName} - {artist}</h6>
</button>

<style>
	.item {
		display: grid;
		grid-template-columns: auto 1fr;
		grid-template-rows: auto auto;
		gap: 10px;
		border: none;
		background: none;
		text-align: left;
	}

	img {
		background-color: black;
		grid-row: 1 / 3;
		grid-column: 1 / 1;
		height: calc(var(--size) * 1px);
		width: calc(var(--size) * 1px);
	}

	h5 {
		font-size: 2em;
		grid-column: 2;
		margin: 0;
		align-self: end;
	}

	h6 {
		font-size: 1.3em;
		grid-column: 2;
		margin: 0;
	}
</style>
