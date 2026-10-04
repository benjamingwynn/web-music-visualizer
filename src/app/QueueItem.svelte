<script lang="ts">
	import iconPlay from "@primer/octicons/build/svg/play-16.svg"
	import iconPlay2 from "@primer/octicons/build/svg/triangle-left-16.svg"
	import iconReady from "@primer/octicons/build/svg/issue-closed-16.svg"
	// import iconProcessing from '@primer/octicons/build/svg/issue-draft-16.svg'
	import iconProcessing from "@primer/octicons/build/svg/gear-16.svg"
	// import iconPending from '@primer/octicons/build/svg/circle-16.svg'
	import iconPending from "@primer/octicons/build/svg/issue-draft-16.svg"
	import {collection} from "./state.ts"
	import PlayIcon from "./PlayIcon.svelte"

	export let id: string

	// use information from our music collection if it's available
	$: collectionEntry = $collection?.songs.find((x) => x.id === id)
	$: metaWritable = collectionEntry?.meta ? collectionEntry.meta : undefined
	$: meta = $metaWritable

	export let heading: string
	export let subheading: string
	export let artSrc: string | null = null
	export let processing: boolean
	export let ready: boolean
	export let selected: boolean
	export let disabled: boolean
	export let pending: boolean
	export let onClick: () => void
</script>

<button class:selected class:ready class:processing type="button" on:click={onClick} {disabled}>
	<div class="art">
		<img src={meta?.albumArtwork ?? artSrc} alt={meta?.albumName ?? heading} />
	</div>
	<h1>{meta?.title ?? heading}</h1>
	<h2>{meta?.artist ?? subheading}</h2>
	<div class="icons">
		<PlayIcon hidden={!selected} />
		{#if ready}
			<img alt="track is ready" class="icon ready" src={iconReady} />
		{/if}
		{#if processing}
			<img alt="track is processing" class="icon processing spin" src={iconProcessing} />
		{/if}
		{#if pending}
			<img alt="track is pending processing" class="icon pending" src={iconPending} />
		{/if}
	</div>
</button>

<style>
	button {
		font-size: 1em;
		display: grid;
		grid-template-rows: auto auto;
		grid-template-columns: 5.5em auto 6.3em;
		padding: 0;
		padding-right: 0.5em;
		border: none;
		background-image: linear-gradient(45deg, #0000004d, transparent);
		background-color: transparent;
		backdrop-filter: blur(8px);
		color: #b5b5b5;
	}

	button.selected {
		color: #f1f1f1;
	}

	h1,
	h2 {
		margin: 0;
		font-weight: normal;
		text-align: left;
		grid-column: 2;
		/* text-overflow: ellipsis;
		overflow: hidden;
		white-space: nowrap; */

		text-overflow: ellipsis;
		overflow: hidden;

		margin-left: 0.3em;
	}

	h1 {
		font-weight: 600;
		align-self: end;
		font-size: 1.2em;
		margin-bottom: 0.1em;
	}

	h2 {
		align-self: start;
		font-size: 0.9em;
	}

	.art {
		grid-row: span 2;
		grid-column: 1;
		aspect-ratio: 1;
	}
	.art img {
		height: 100%;
		width: 100%;
	}

	.icons {
		font-size: 2em;
		grid-row: 1 / span 2;
		grid-column: 3;
		margin-left: 1em;
		display: flex;
		flex-flow: row nowrap;
		align-items: center;
		justify-content: end;
	}

	.icons img {
		filter: invert();
		opacity: 0.7;
	}

	.icon {
		font-size: 2em;
		margin: 0 0.1em;
	}

	.icon img {
		height: 1em;
		display: block;
	}

	.spin {
		animation: spin infinite 3.5s linear;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>
