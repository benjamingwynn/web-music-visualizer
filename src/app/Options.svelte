<script lang="ts">
	import {MusicCanvas} from "../audio/canvas"

	export let musicCanvas: MusicCanvas

	const selectedId = musicCanvas.currentVisualizationId
	const all = MusicCanvas.registeredVisualizationsStore

	const next = () => {
		const i = $all.findIndex(([x]) => x === $selectedId)
		const n = $all[i + 1]
		if (n) {
			musicCanvas.startVisualization(n[0])
		} else {
			musicCanvas.startVisualization($all[0][0])
		}
	}
</script>

<svelte:window
	on:keydown={(ev) => {
		if (ev.key === "n") {
			ev.preventDefault()
			next()
		}
	}}
/>

<h1>this is Options</h1>
<h1>press N for next. selected={$selectedId}.</h1>

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
			<h3>{vis.info.author}</h3>
			<h4>{vis.info.description}</h4>
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
		padding: 0.5em 0.2em;
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

	h2 {
		font-weight: bold;
		font-size: 1.2em;
	}

	h3 {
		margin-bottom: 0.2em;
	}
</style>
