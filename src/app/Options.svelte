<script lang="ts">
	import {MusicCanvas} from "../audio/canvas"
	import {onMount, getContext} from "svelte"
	import type {Writable} from "svelte/store"

	const editorFocused = getContext<Writable<boolean>>("editorFocused")

	export let musicCanvas: MusicCanvas
	let showList = false

	const showVisualizationUrl = getContext<Writable<string[]>>("showVisualizationUrl")

	const selectedId = musicCanvas.currentVisualizationIdStore
	const all = MusicCanvas.registeredVisualizationsStore
	$: active = $all.find(([id]) => id === $selectedId)?.[1]

	//
	const shift = (delta: number) => {
		const currentIndex = $all.findIndex(([x]) => x === $selectedId)
		const targetIndex = currentIndex + delta
		const first = $all[0]
		const last = $all.at(-1)
		const selectTarget = $all[targetIndex] ?? (delta > 0 ? first : last)
		const selectedTargetId = selectTarget[0]
		musicCanvas.startVisualization(selectedTargetId)
	}
	const next = () => shift(+1)
	const prev = () => shift(-1)

	let showCode = false
</script>

<svelte:window
	on:keydown={(ev) => {
		if ($editorFocused) {
			return
		}
		if (ev.key === "n") {
			ev.preventDefault()
			next()
		}
		if (ev.key === "p") {
			ev.preventDefault()
			prev()
		}
	}}
/>

<div class="float">
	<!-- <h1>this is Options</h1>
	<h1>press N for next, P for previous. selected={$selectedId}.</h1> -->

	<div class="list" hidden={!showList}>
		{#each $all as [id, vis]}
			<button
				type="button"
				class:active={id === $selectedId}
				on:click={() => {
					showList = false
					musicCanvas.startVisualization(id)
				}}
			>
				<h2>{vis.info.name}</h2>
				<h3>{vis.info.author}</h3>
				<h4>{vis.info.description}</h4>
				{#if vis.url}
					<h4>{vis.url}</h4>
					<button
						type="button"
						on:click={(ev) => {
							ev.preventDefault()
							ev.stopPropagation()
							if (vis.url) $showVisualizationUrl = [...$showVisualizationUrl, vis.url]
						}}>edit code</button
					>
				{/if}
			</button>
		{/each}
	</div>

	<button
		type="button"
		on:click={() => {
			showList = !showList
		}}
	>
		<h2>{active?.info.name}</h2>
	</button>

	<h4>{active?.info.description}</h4>
	<h3>{active?.info.author}</h3>

	<!-- <button type="button" on:click={() => (showCode = !showCode)}>show code</button> -->
</div>

<style lang="less">
	.list {
		display: flex;
		flex-flow: column nowrap;
		overflow-y: auto;
		max-height: 930px;
	}

	.float {
		position: fixed;
		right: 0;
		width: 400px;
		overflow-y: auto;
		bottom: 0;
		background: rgba(0, 0, 255, 0.5);
		margin-right: 1em;
		color: white;
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

	h3 {
		font-style: italic;
	}

	h2 {
		font-weight: bold;
		font-size: 1.2em;
	}

	h3 {
		margin-bottom: 0.2em;
	}

	*[hidden] {
		display: none;
	}
</style>
