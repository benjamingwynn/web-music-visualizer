<script lang="ts">
	import type {Writable} from "svelte/store"
	import type {MusicCollection} from "./musicCollection"
	import CoverflowAlbum from "./CoverflowAlbum.svelte"
	import {collection, nowPlayingId, showLibrary} from "./state"
	import {DEFAULT_ALBUM_ART} from "./config"
	import {beforeUpdate, afterUpdate, tick} from "svelte"

	let scale = 1
	$: albumSize = 600 * scale

	export let pleaseQueueMusic: (files: File[]) => void
	export let pleaseClearQueue: () => void

	$: albums = $collection?.albums

	let scrollContainer: Element
	let scrollPosition = 0

	let horizontalScrolling = false
	let zooming = false
	let scrollEndTimer: number

	$: albumsPerPage = (scrollContainer?.clientWidth ?? 0) / albumSize
	$: selectedIndex = Math.floor(scrollPosition / albumSize)
	$: startIndex = selectedIndex - Math.floor(albumsPerPage / 2)
	$: endIndex = selectedIndex + Math.floor(albumsPerPage / 2)

	$: selectedKey = (scrollContainer?.querySelector(`div[data-index="${selectedIndex}"]`) as HTMLElement | undefined)?.dataset.key
	afterUpdate(() => {
		if (selectedKey) {
			// try to fix scroll pos when adding things before/after
			// (sadly this doesn't work for when we're actually scrolling so just disable when we are scrolling)
			const e = scrollContainer.querySelector(`div[data-key="${selectedKey}"]`)
			e?.scroll()
		}
	})

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
	<div class="coverflow" style:--size={albumSize + "px"}>
		{#if $albums}
			{#each Object.entries($albums) as [key, album], index (key)}
				<!-- kinda a hack but just find the first song -->
				{@const song = album.find((x) => x)}
				{#if song}
					<CoverflowAlbum
						{key}
						size={albumSize}
						meta={song.meta}
						{index}
						{startIndex}
						{endIndex}
						{selectedIndex}
						{zooming}
						trackList={album}
						onClick={async (isSelected, alt) => {
							if (isSelected) {
								$showLibrary = false
								if (!alt) {
									pleaseClearQueue()
								}
								pleaseQueueMusic(await Promise.all(album.filter((x) => x).map((x) => x.file.getFile())))
							} else {
								const left = index * albumSize + albumSize / 2
								scrollContainer.scrollTo({behavior: "smooth", left})
							}
						}}
					/>
				{/if}
			{/each}
		{/if}
	</div>
</div>

<style>
	.outer {
		user-select: none;
		overflow-y: hidden;
		overflow-x: scroll;
		scroll-snap-type: x mandatory;
		align-self: stretch;
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
