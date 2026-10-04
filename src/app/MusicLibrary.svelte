<script lang="ts">
	import Button from "./Button.svelte"
	import Coverflow from "./Coverflow.svelte"
	import {clearAllMetadata, openMusicCollection, type MusicCollection} from "./musicCollection"
	import MusicLibraryItem from "./MusicLibraryItem.svelte"
	import {showLibrary} from "./state"

	export let pleaseQueueMusic: (files: File[]) => void
	export let pleaseClearQueue: () => void

	let collection: undefined | MusicCollection = undefined

	let mode: "songs" | "albums" = "albums"
</script>

<main hidden={!$showLibrary}>
	{#if !collection}
		{#if "showDirectoryPicker" in window}
			<div>
				<h1>please select music directory</h1>
				<p>this program will scan for music files in this directory and all subdirectories</p>
			</div>
			<div>
				<Button
					onClick={async () => {
						collection = await openMusicCollection()
					}}>select music directory</Button
				>
				<Button
					onClick={async () => {
						await clearAllMetadata()
						collection = await openMusicCollection()
					}}>select music directory (clear cache)</Button
				>
			</div>
		{:else}
			<h2>your browser is not supported</h2>
		{/if}
	{:else}
		<div>
			<Button
				onClick={() => {
					mode = "songs"
				}}>songs</Button
			>
			<Button
				onClick={() => {
					mode = "albums"
				}}>albums</Button
			>
		</div>
		{#if mode === "songs"}
			<div class="list song-list">
				{#each collection.songs as song}
					<MusicLibraryItem {pleaseQueueMusic} handle={song.file} metadata={song.meta}></MusicLibraryItem>
				{/each}
			</div>
		{:else if mode === "albums"}
			<Coverflow {collection} {pleaseQueueMusic} {pleaseClearQueue}></Coverflow>
		{/if}
	{/if}
	<div>
		<Button
			onClick={async () => {
				$showLibrary = false
			}}>close library</Button
		>
	</div>
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
		visibility: visible;
		transition: all 0.35s;
		align-content: baseline;
		grid-template-rows: auto 1fr;
	}

	main[hidden] {
		visibility: hidden;
		opacity: 0;
		transform: scale(1.1);
	}

	.song-list {
		overflow-y: auto;
	}
</style>
