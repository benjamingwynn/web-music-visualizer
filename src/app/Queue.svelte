<script lang="ts">
	import type {MusicCanvas} from "../audio/canvas"
	import type {Analysis} from "musiq"
	import {loadMusiq} from "../audio/musiq.ts"
	import {pQueue} from "./pQueue.ts"
	import QueueItem from "./QueueItem.svelte"

	export let musicCanvas: MusicCanvas
	export let onSelect: (file: File) => Promise<void>
	export let onAnalysis: (analysis: Analysis) => Promise<void>

	let selected: File | null = null
	let queue: File[] = []
	let ready: File[] = []
	let processing: File[] = []
	let loadingMusiq = false

	const analyses = new Map<File, Promise<Analysis>>()
	const analysisQueue = pQueue<Analysis>(2)

	let musiq: ReturnType<typeof loadMusiq>
	;(async () => {
		loadingMusiq = true
		musiq = loadMusiq()
		await musiq
		loadingMusiq = false
	})()

	let locked = false
	const handleSelection = async (file: File) => {
		if (locked) return
		selected = file
		locked = true
		await onSelect(file)
		locked = false
		const analysisPromise = analyses.get(file)
		if (!analysisPromise) throw new Error("wtf")
		const analysis = await analysisPromise
		if (file !== selected) {
			console.warn("*** bailed from analysis callback because song no longer matches ***")
			return
		}
		await onAnalysis(analysis)
	}

	const onchange = async (event: any) => {
		const files = event?.target?.files as File[]
		if (!files) return
		for (const file of files) {
			const fn = async () => {
				// todo: do we wanna queue?
				return analysisQueue(async () => {
					processing = [...processing, file]
					// we gotta wait for the analyzer
					const analyzer = await musiq
					// get the data and analyze it
					const arrayBuffer = await file.arrayBuffer()
					const rtn = await analyzer(arrayBuffer)
					// finished processing this file
					processing.splice(processing.indexOf(file), 1)
					processing = processing
					// so its now ready
					ready = [...ready, file]
					return rtn
				})
			}
			analyses.set(file, fn())
		}
		// if nothing queued yet then start the song
		if (queue.length === 0) {
			handleSelection(files[0])
		}
		queue = [...queue, ...files]
	}

	const shiftPosition = (delta: number) => {
		const index = queue.findIndex((x) => x === selected)
		if (index === -1) return
		const newIndex = index + delta
		const newItem = queue[newIndex]
		if (!newItem) return
		handleSelection(newItem)
	}
	const next = () => {
		shiftPosition(+1)
	}
	const previous = () => {
		shiftPosition(-1)
	}
</script>

{#if loadingMusiq}
	<h1>loading musiq lib/models</h1>
{/if}

<h1>this is the queue</h1>
<input type="file" on:change={onchange} multiple />
<button type="button" disabled={locked} on:click={previous}>previous</button>
<button type="button" disabled={locked} on:click={next}>next</button>

<div class="queue">
	{#each queue as item}
		<QueueItem
			heading={item.name}
			disabled={locked}
			subheading={item.type}
			processing={processing.includes(item)}
			ready={ready.includes(item)}
			selected={selected === item}
			pending={!processing.includes(item) && !ready.includes(item)}
			onClick={() => {
				handleSelection(item)
			}}
		></QueueItem>
	{/each}
</div>

<style>
	.queue {
		display: flex;
		flex-flow: column nowrap;
		max-width: 300px;
	}

	.item {
		border: solid thin blue;
	}

	button {
		display: grid;
	}

	h1,
	h2,
	h3 {
		margin: 0;
		font-size: 1em;
		font-weight: normal;
	}
</style>
