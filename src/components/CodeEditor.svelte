<script lang="ts">
	import {onMount, getContext} from "svelte"
	import type {Writable} from "svelte/store"
	import tsBlankSpace from "ts-blank-space"
	import Window from "./Window.svelte"
	import Monaco from "./Monaco.svelte"
	import {MusicCanvas as _MusicCanvas} from "api"
	import {acceptedSecurityWarning} from "../app/state.ts"

	const showVisualizationUrl = getContext<Writable<string[] | undefined>>("showVisualizationUrl")

	let evalOnChange = true
	let immediatelyEval = true

	export let code: string
	export let title: string
	export let onChange = (code: string) => {}
	export let hidden = false
	export let url: string

	let monacoEditor: Monaco | undefined

	$: hidden, requestAnimationFrame(() => monacoEditor?.layout())

	let error: string | undefined = undefined

	export const setCode = (code: string) => {
		monacoEditor?.setValue(code)
	}

	function doEval(runtimeCode: string) {
		// lazy filter to not include import in eval, so we can copy/paste between real source easier
		runtimeCode = runtimeCode
			.split("\n")
			.filter((ln) => (ln.trim().startsWith("import ") ? false : true))
			.join("\n")

		console.log("evaluating...", {runtimeCode})
		try {
			const evaluate = function evaluate() {
				window._evalUrl = url
				// ^ this is a hack so that when we're eval-ing the file, we know where it came from,
				// and so MusicCanvas::registerVisualization can say what URL made the visual even
				// though we're technically in an eval, so stack wouldn't work

				// FUTURE: replace this eval with something better.
				// perhaps worker in iframe - but browser support isn't quite there in 2026....
				// ...or perhaps be sane and don't let the user change visualizations?
				// but that requires compromising on the vision - so... eval stays :)
				new Function("MusicCanvas", runtimeCode)(_MusicCanvas)
			}
			evaluate()
			error = undefined
			console.log("... runtime okay!")
		} catch (err: any) {
			console.log("... runtime error!")
			$showVisualizationUrl = [...$showVisualizationUrl, window._evalUrl]
			console.error(err)
			window._error = err
			error = _error.toString()
		}
	}

	function run(newCode: string) {
		localStorage.codeBackup = newCode

		// localStorage._editorValue = code
		console.log("compiling...")
		const runtimeCode = tsBlankSpace(newCode)
		console.log("... compile okay!")

		if (evalOnChange) {
			doEval(runtimeCode)
		}
	}

	onMount(() => {
		if (immediatelyEval) {
			run(code)
		}
	})
</script>

<Window
	onClose={() => {
		$showVisualizationUrl = $showVisualizationUrl.filter((x) => x !== url)
	}}
	{hidden}
	{title}
	onResize={() => {
		console.log("resized window!")
		requestAnimationFrame(() => {
			monacoEditor?.layout()
		})
	}}
>
	<div class="outer">
		{#if error}
			<div class="error">{error}</div>
		{/if}

		{#if !$acceptedSecurityWarning}
			<div class="warning">
				<h1>Security warning</h1>
				<p>Editing visualisations, while cool, poses a massive security risk in its current form. This eval's on the main thread, meaning it can effectively be able to do anything on this page. <strong>You've been warned.</strong> This is for cool factor, not an exercise in best practice security.</p>
				<button
					type="button"
					on:click={() => {
						$acceptedSecurityWarning = true
					}}>I know what I'm doing, let me edit code</button
				>
			</div>
		{:else}
			<div class="editor">
				<Monaco
					bind:this={monacoEditor}
					{code}
					onChange={(newCode) => {
						onChange(newCode)
						run(newCode)
					}}
				/>
			</div>

			<div class="controls">
				<button
					type="button"
					on:click={() => {
						run(monacoEditor.getValue())
					}}>execute code</button
				>
				<label><input type="checkbox" bind:checked={evalOnChange} /> automatically execute on code change</label>
			</div>
		{/if}
	</div>
</Window>

<style>
	.error {
		color: pink;
		background: darkred;
		border: solid thin red;
	}

	.warning {
		height: 100%;
	}

	.outer {
		--controls-height: 4em;
		height: 100%;
	}

	.editor {
		height: calc(100% - var(--controls-height));
	}

	.controls {
		height: var(--controls-height);
	}
</style>
