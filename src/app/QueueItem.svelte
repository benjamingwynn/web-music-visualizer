<script lang="ts">
	import iconPlay from "@primer/octicons/build/svg/play-16.svg"
	import iconPlay2 from "@primer/octicons/build/svg/triangle-left-16.svg"
	import iconReady from "@primer/octicons/build/svg/issue-closed-16.svg"
	// import iconProcessing from '@primer/octicons/build/svg/issue-draft-16.svg'
	import iconProcessing from "@primer/octicons/build/svg/gear-16.svg"
	// import iconPending from '@primer/octicons/build/svg/circle-16.svg'
	import iconPending from "@primer/octicons/build/svg/issue-draft-16.svg"

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
		<img src={artSrc} alt={heading} />
	</div>
	<h1>{heading}</h1>
	<h2>{subheading}</h2>
	<div class="icons">
		{#if selected}
			<img alt="track is selected" class="icon" src={iconPlay} />
		{/if}
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
		grid-template-columns: 6em auto 5em;
		padding: 0;
		padding-right: 0.5em;
		border: transparent solid;
	}

	button.selected {
		border-color: blue;
	}

	h1,
	h2 {
		margin: 0;
		font-weight: normal;
		font-size: 1em;
		text-align: left;
		grid-column: 2;
		/* text-overflow: ellipsis;
		overflow: hidden;
		white-space: nowrap; */

		text-overflow: ellipsis;
		overflow: hidden;
	}

	h1 {
		font-weight: 600;
		align-self: end;
		margin-bottom: 0.3em;
	}

	h2 {
		align-self: start;
	}

	.art {
		grid-row: span 2;
		grid-column: 1;
		aspect-ratio: 1;
	}
	.icons {
		grid-row: 1 / span 2;
		grid-column: 3;
		margin-left: 1em;
		display: flex;
		flex-flow: row nowrap;
		align-items: center;
		justify-content: end;
	}

	.icon {
		font-size: 2em;
		margin: 0 0.1em;
	}

	img {
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
