<script lang="ts">
	import CodeEditor from "./CodeEditor.svelte"
	import {MusicCanvas} from "../audio/canvas"
	import {onMount, getContext} from "svelte"
	import type {Writable} from "svelte/store"

	const editorFocused = getContext<Writable<boolean>>("editorFocused")

	export let musicCanvas: MusicCanvas
	let showList = false

	const selectedId = musicCanvas.currentVisualizationIdStore
	const all = MusicCanvas.registeredVisualizationsStore
	$: active = $all.find(([id]) => id === $selectedId)?.[1]

	const shift = (delta: number) => {
		const i = $all.findIndex(([x]) => x === $selectedId)
		const n = $all[i + delta]
		if (n) {
			musicCanvas.startVisualization(n[0])
		} else {
			musicCanvas.startVisualization($all[0][0])
		}
	}
	const next = () => shift(+1)
	const prev = () => shift(-1)
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

<h1>this is Options</h1>
<h1>press N for next, P for previous. selected={$selectedId}.</h1>

<button
	type="button"
	on:click={() => {
		showList = !showList
	}}
>
	<h2>{active?.info.name}</h2>
</button>

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
		</button>
	{/each}
</div>

<div class="editor" hidden={showList}>
	<CodeEditor></CodeEditor>
</div>

<style lang="less">
	.list {
		display: flex;
		flex-flow: column nowrap;
		overflow-y: auto;
		max-height: 600px;
	}

	.editor {
		height: 100%;
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

	*[hidden] {
		display: none;
	}
</style>
