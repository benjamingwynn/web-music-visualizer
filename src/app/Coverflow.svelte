<script lang="ts">
	import {tick} from "svelte"
	import type {Writable} from "svelte/store"
	import type {MusicCollection} from "./musicCollection"
	import CoverflowAlbum from "./CoverflowAlbum.svelte"
	import {showLibrary} from "./state"
	import {DEFAULT_ALBUM_ART} from "./config"

	let scale = 1
	$: albumSize = 600 * scale

	export let pleaseQueueMusic: (files: File[]) => void
	export let collection: MusicCollection

	$: albums = collection.albums

	let scrollContainer: Element
	let scrollPosition = 0

	let horizontalScrolling = false
	let zooming = false
	let scrollEndTimer: number

	$: albumsPerPage = (scrollContainer?.clientWidth ?? 0) / albumSize
	$: selectedIndex = Math.floor(scrollPosition / albumSize)
	$: startIndex = selectedIndex - Math.floor(albumsPerPage / 2)
	$: endIndex = selectedIndex + Math.floor(albumsPerPage / 2)

	function handleScroll() {
		scrollPosition = scrollContainer.scrollLeft

		if (zooming) return

		horizontalScrolling = true

		clearTimeout(scrollEndTimer)
		scrollEndTimer = window.setTimeout(() => {
			horizontalScrolling = false
		}, 120)
	}

	async function handleZoom(ev: WheelEvent) {
		if (!ev.ctrlKey) return // only pinch, not normal scroll
		ev.preventDefault()
		if (horizontalScrolling) return

		const nextScale = Math.min(Math.max(scale - ev.deltaY * 0.01, 0.5), 2)
		if (nextScale === scale) return

		const rect = scrollContainer.getBoundingClientRect()
		const pointerX = ev.clientX - rect.left
		const spacer = scrollContainer.clientWidth / 2

		const logicalX = (scrollContainer.scrollLeft + pointerX - spacer) / albumSize

		zooming = true
		scale = nextScale

		// wait for the new album size / scroll width to be laid out..
		await tick()

		// ...keep the same logical point beneath the cursor/fingers with math
		scrollContainer.scrollLeft = spacer + logicalX * albumSize - pointerX

		// allow the scroll event caused by the zoom correction to finish first
		requestAnimationFrame(() => {
			zooming = false
		})
	}
</script>

<div bind:this={scrollContainer} class="outer" on:wheel={handleZoom} on:scroll={handleScroll}>
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

<!-- without this image, the browser will unload the default image when it hasn't seen it in a while, needing it to be refetch from disk/network, which can be slow and cause the default album art to lag behind others -->
<img class="preload" src={DEFAULT_ALBUM_ART} alt="preload" />

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

	.preload {
		position: fixed;
		top: -1000px;
		left: -1000px;
		opacity: 0;
	}
</style>
