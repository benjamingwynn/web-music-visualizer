<script lang="ts">
	import type {MusicCanvas} from "../audio/canvas"
	import type {Analysis} from "musiq"
	import {loadMusiq} from "../audio/musiq.ts"
	import {pQueue} from "../util/pQueue.ts"
	import QueueItem from "./QueueItem.svelte"
	import Button from "./Button.svelte"
	import {showLibrary} from "../app/state.ts"
	import {DEFAULT_ALBUM_ART} from "../app/config.ts"
	import {persistentStore} from "../util/persistentStore.ts"
	import {sha256} from "../util/sha256.ts"

	export let musicCanvas: MusicCanvas
	export let onSelect: (file: File) => Promise<void>
	export let onAnalysis: (analysis: Analysis) => Promise<void>
	export let onAddToQueue: () => void
	export let pleaseStopAudio: () => void

	let selected: File | null = null
	let queue: File[] = []
	let ready: File[] = []
	let processing: File[] = []
	let failed: File[] = []
	let loadingMusiq = false

	let picker: HTMLInputElement

	const analyses = new Map<File, Promise<Analysis | null>>()
	const analysisQueue = pQueue<Analysis | null>(2)

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
		if (analysis === null) {
			console.error("this analysis is not complete, but we were asked to select it!")
			return
		}
		if (file !== selected) {
			console.warn("*** bailed from analysis callback because song no longer matches ***")
			return
		}
		await onAnalysis(analysis)
	}

	const onchange = async (event: any) => {
		const files = event?.target?.files as File[]
		if (!files) return
		await onFiles(files)
	}

	const cachedAnalysisStore = persistentStore("analysis")

	export const onFiles = async (files: File[]) => {
		const queueEmpty = queue.length === 0
		queue = [...queue, ...files]
		for (const file of files) {
			const fn = async () => {
				return analysisQueue(async () => {
					// if the queue no longer includes this file, skip it
					if (!queue.includes(file)) {
						console.warn("skipping processing of stale queue item!", file)
						return null
					}

					processing = [...processing, file]
					// we gotta wait for the analyzer
					const analyzer = await musiq

					// get the data and analyze it
					const arrayBuffer = await file.arrayBuffer()

					const cache = await cachedAnalysisStore
					// hash the file, determine if its in cache
					const hash = await sha256(arrayBuffer)

					// use replacers to handle float32array
					const stringify = (v: Analysis): string => JSON.stringify(v, (_, d) => (d instanceof Float32Array ? {_type: "Float32Array", data: Array.from(d)} : d))
					const parse = (v: string): Analysis => JSON.parse(v, (_, d) => (d?._type === "Float32Array" && Array.isArray(d.data) ? new Float32Array(d.data) : d)) as Analysis

					const ok = () => {
						// finished processing this file
						processing.splice(processing.indexOf(file), 1)
						processing = processing

						// so its now ready
						ready = [...ready, file]
					}

					const fromCache = await cache.get(hash)
					if (fromCache) {
						const rtn = parse(fromCache)
						ok()
						return rtn
					}

					try {
						const rtn = await analyzer(arrayBuffer)

						const toCache = stringify(rtn)
						await cache.set(hash, toCache)

						ok()

						return rtn
					} catch (ex) {
						// finished processing this file (cuz it broke)
						processing.splice(processing.indexOf(file), 1)
						processing = processing

						failed = [...failed, file]

						console.error("analysis error", ex)
						throw ex
					}
				})
			}
			analyses.set(file, fn())
		}
		// if nothing queued yet then start the song
		if (queueEmpty) {
			handleSelection(files[0])
		}
		onAddToQueue()
	}
	export const pleaseQueueMusic = (files: File[]) => {
		onFiles(files)
	}

	const shiftPosition = (delta: number) => {
		const index = queue.findIndex((x) => x === selected)
		if (index === -1) return
		const newIndex = index + delta
		const newItem = queue[newIndex]
		if (!newItem) return
		handleSelection(newItem)
	}
	export const next = () => {
		shiftPosition(+1)
	}
	export const previous = () => {
		shiftPosition(-1)
	}
	export const openFilePicker = () => {
		picker.click()
	}

	export const pleaseClearQueue = () => {
		pleaseStopAudio()
		queue = []
		selected = null
	}
</script>

{#if loadingMusiq}
	<h1>loading musiq lib/models</h1>
{/if}

<div class="queue">
	{#each queue as item}
		<QueueItem
			id={item.name}
			heading={item.name}
			disabled={locked}
			subheading={item.type}
			processing={processing.includes(item)}
			ready={ready.includes(item)}
			failed={failed.includes(item)}
			selected={selected === item}
			artSrc={DEFAULT_ALBUM_ART}
			pending={!processing.includes(item) && !ready.includes(item)}
			onClick={() => {
				handleSelection(item)
			}}
		></QueueItem>
	{/each}
</div>

<Button
	onClick={async () => {
		$showLibrary = true
	}}>open library</Button
>

<Button onClick={pleaseClearQueue}>clear queue</Button>

<Button
	onClick={async () => {
		;(await cachedAnalysisStore).clear()
	}}>clear analysis cache</Button
>

<input type="file" on:change={onchange} multiple bind:this={picker} />

<svelte:body
	on:drop={(ev) => {
		const files = [...(ev.dataTransfer?.items ?? [])].flatMap((item, i) => {
			if (item.kind === "file") {
				const file = item.getAsFile()
				if (file) return file
			}
			return []
		})
		onFiles(files)
	}}
/>

<style>
	.queue {
		display: flex;
		flex-flow: column nowrap;
		/* padding-top: calc(100vh - 200px); */
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
