<script lang="ts">
	import {MusicCanvas} from "../audio/canvas"

	export let musicCanvas: MusicCanvas

	const selectedId = musicCanvas.currentVisualizationId
	const all = MusicCanvas.registeredVisualizationsStore
</script>

<h1>test</h1>
<h1>selected={$selectedId}</h1>

<div>
	{#each $all as [id, vis]}
		<button
			type="button"
			class:active={id === $selectedId}
			on:click={() => {
				musicCanvas.startVisualization(id)
			}}
		>
			<h2>{vis.info.name}</h2>
			<h2>{vis.info.author}</h2>
			<h3>{vis.info.description}</h3>
		</button>
	{/each}
</div>

<style lang="less">
	div {
		display: flex;
		flex-flow: column nowrap;
	}

	button {
		display: grid;
	}

	button.active {
		border: solid blue;
	}

	h2,
	h3,
	h4 {
		font-size: 1em;
		margin: 0;
		font-weight: normal;
		text-align: left;
	}
</style>
