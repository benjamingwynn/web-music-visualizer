<script lang="ts">
	import type {Writable} from "svelte/store"
	import type {SongMetadata} from "./musicCollection"

	export let metadata: Writable<SongMetadata>

	$: artist = $metadata.artist
	$: title = $metadata.title
</script>

<div class="item" style:--size={120}>
	<img alt="artwork" src={$metadata.albumArt ?? "/img/CD_icon.svg"} />
	<h5>{title}</h5>
	<h6>{$metadata.albumName} - {artist}</h6>
</div>

<style>
	.item {
		display: grid;
		grid-template-columns: auto 1fr;
		grid-template-rows: auto auto;
		gap: 10px;
	}

	img {
		grid-row: 1 / 3;
		grid-column: 1 / 1;
		height: calc(var(--size) * 1px);
		width: calc(var(--size) * 1px);
	}

	h5 {
		grid-column: 2;
		font-size: 2em;
		margin: 0;
		align-self: end;
	}

	h6 {
		grid-column: 2;
		margin: 0;
	}
</style>
