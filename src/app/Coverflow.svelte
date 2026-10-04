<script lang="ts">
	import {tick} from "svelte"
	import type {Writable} from "svelte/store"
	import type {MusicCollection} from "./musicCollection"
	import CoverflowAlbum from "./CoverflowAlbum.svelte"
	import {showLibrary} from "./state"

	let scale = 1
	$: albumSize = 600 * scale

	export let pleaseQueueMusic: (files: File[]) => void
	export let collection: MusicCollection

	$: albums = collection.albums

	let scrollContainer: Element
	let scrollPosition = 0

	$: albumsPerPage = (scrollContainer?.clientWidth ?? 0) / albumSize
	$: selectedIndex = Math.floor(scrollPosition / albumSize)
	$: startIndex = selectedIndex - Math.floor(albumsPerPage / 2)
	$: endIndex = selectedIndex + Math.floor(albumsPerPage / 2)

	async function handleZoom(ev: WheelEvent) {
		if (!ev.ctrlKey) return // only pinch, not normal scroll
		ev.preventDefault()

		const nextScale = Math.min(Math.max(scale - ev.deltaY * 0.01, 0.5), 2)
		if (nextScale === scale) return

		const rect = scrollContainer.getBoundingClientRect()
		const pointerX = ev.clientX - rect.left
		const spacer = scrollContainer.clientWidth / 2

		const logicalX = (scrollContainer.scrollLeft + pointerX - spacer) / albumSize

		scale = nextScale

		// wait for the new album size / scroll width to be laid out..
		await tick()

		//...keep the same logical point beneath the cursor/fingers with math
		scrollContainer.scrollLeft = spacer + logicalX * albumSize - pointerX
	}
</script>

<div
	bind:this={scrollContainer}
	class="outer"
	on:wheel={handleZoom}
	on:scroll={(ev) => {
		scrollPosition = scrollContainer?.scrollLeft
	}}
>
	<div class="coverflow">
		{#each Object.values($albums) as album, index}
			<!-- kinda a hack but just find the first song -->
			{@const song = album.find((x) => x)}
			{#if song}
				<CoverflowAlbum
					size={albumSize}
					meta={song.meta}
					{index}
					{startIndex}
					{endIndex}
					{selectedIndex}
					trackList={album}
					onClick={async () => {
						if (selectedIndex === index) {
							$showLibrary = false
							pleaseQueueMusic(await Promise.all(album.filter((x) => x).map((x) => x.file.getFile())))
						} else {
							const left = index * albumSize
							scrollContainer.scrollTo({behavior: "smooth", left})
						}
					}}
				/>
			{/if}
		{/each}
	</div>
</div>
<h1>{startIndex}, {endIndex}, {selectedIndex}, {scrollPosition}</h1>

<style>
	.outer {
		user-select: none;
		overflow-y: hidden;
		overflow-x: scroll;
		scroll-snap-type: x mandatory;
		align-self: stretch;
		background: radial-gradient(black 30%, transparent);
	}
	.coverflow::before,
	.coverflow::after {
		content: "";
		flex: 0 0 50%;
	}

	.coverflow {
		height: 100%;
		display: flex;
		flex-flow: row nowrap;
	}
</style>
