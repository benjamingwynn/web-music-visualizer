<script lang="ts">
	import Button from "./Button.svelte"
	import {clearAllMetadata, openMusicCollection, type MusicCollection} from "./musicCollection"
	import MusicLibraryItem from "./MusicLibraryItem.svelte"

	let library: undefined | MusicCollection = undefined
</script>

<main>
	<h1>this is the music library!</h1>

	{#if "showDirectoryPicker" in window}
		<Button
			onClick={async () => {
				library = await openMusicCollection()
			}}>select music directory</Button
		>
		<Button
			onClick={async () => {
				await clearAllMetadata()
			}}>clear all metadata</Button
		>
	{:else}
		<h2>your browser is not supported</h2>
	{/if}

	{#if library}
		<h1>library loaded</h1>
		<div class="list song-list">
			{#each library.songs as song}
				<MusicLibraryItem metadata={song.meta}></MusicLibraryItem>
			{/each}
		</div>
	{/if}
</main>

<style>
	main {
		z-index: 1;
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		backdrop-filter: blur(10px);
		background-color: rgba(0, 0, 0, 0.4);
		display: grid;
	}

	.song-list {
		overflow-y: auto;
	}
</style>
