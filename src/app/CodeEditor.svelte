<script lang="ts">
	import * as monaco from "monaco-editor"
	import {onMount, getContext} from "svelte"
	import type {Writable} from "svelte/store"
	import tsBlankSpace from "ts-blank-space"
	import Window from "./Window.svelte"

	// todo: this is actually quite difficult/complicated, we need to extract just the relevant types for doing MusicCanvas.register and pop them in here:
	const EXTRA_TYPES = `
		// ...
	`

	const editorFocused = getContext<Writable<boolean>>("editorFocused")

	const showVisualizationUrl = getContext<Writable<string[] | undefined>>("showVisualizationUrl")

	let evalOnChange = true
	let immediatelyEval = true

	let container: HTMLElement
	// var defaultCode = defaultText
	// var jsCode = localStorage._editorValue ?? defaultCode
	export let code: string
	export let title: string
	export let onChange = (code: string) => {}
	export let hidden = false
	export let url: string

	$: hidden, requestAnimationFrame(() => editor.layout())

	let editor: monaco.editor.IStandaloneCodeEditor

	let error: string | undefined = undefined

	export const setCode = (code: string) => {
		editor.setValue(code)
	}

	function doEval(runtimeCode: string) {
		// lazy filter to not include import in eval, so we can copy/paste between real source easier
		runtimeCode = runtimeCode
			.split("\n")
			.filter((ln) => (ln.trim().startsWith("import ") ? false : true))
			.join("\n")

		console.log("evaluating...", {runtimeCode})
		try {
			window._evalUrl = url
			const evaluate = function evaluate() {
				eval(runtimeCode)
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
		// localStorage._editorValue = code
		console.log("compiling...")
		const runtimeCode = tsBlankSpace(newCode)
		console.log("... compile okay!")

		if (evalOnChange) {
			doEval(runtimeCode)
		}
	}

	onMount(() => {
		if (!self.MonacoEnvironment) {
			self.MonacoEnvironment = {
				globalAPI: true,
				getWorkerUrl(_workerId, label) {
					switch (label) {
						case "css":
						case "less":
						case "scss":
							return "/monaco/language/css/css.worker.js"
						case "html":
						case "handlebars":
						case "razor":
							return "/monaco/language/html/html.worker.js"
						case "json":
							return "/monaco/language/json/json.worker.js"
						case "javascript":
						case "typescript":
							return "/monaco/language/typescript/ts.worker.js"
						default:
							return "/monaco/editor/editor.worker.js"
					}
				},
			}

			// Add additional d.ts files to the JavaScript language service and change.
			// Also change the default compilation options.
			// The sample below shows how a class Facts is declared and introduced
			// to the system and how the compiler is told to use ES6 (target=2).

			// validation settings
			monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
				noSemanticValidation: true,
				noSyntaxValidation: false,
			})

			// compiler options
			monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
				target: monaco.languages.typescript.ScriptTarget.ES2015,
				allowNonTsExtensions: true,
			})

			// extra libraries
			var libSource = EXTRA_TYPES
			console.log("types:", libSource)
			// var libSource = ["declare class Facts {", "    /**", "     * Returns the next fact", "     */", "    static next():string", "}"].join("\n")
			var libUri = "ts:system.d.ts"
			monaco.languages.typescript.javascriptDefaults.addExtraLib(libSource, libUri)
			// When resolving definitions and references, the editor will try to use created models.
			// Creating a model for the library allows "peek definition/references" commands to work with the library.
			monaco.editor.createModel(libSource, "typescript", monaco.Uri.parse(libUri))
		}

		editor = monaco.editor.create(container, {
			value: code,
			language: "typescript",
			theme: "vs-dark",
			minimap: {
				enabled: false,
			},
		})
		// run()

		// Focus event
		editor.onDidFocusEditorWidget(() => {
			$editorFocused = true
			console.log("Editor is focused")
		})

		// Blur (unfocused) event
		editor.onDidBlurEditorWidget(() => {
			$editorFocused = false
			console.log("Editor lost focus")
		})

		let lastCode = code
		editor.onKeyUp(() => {
			const code = editor.getValue()
			if (code === lastCode) return
			lastCode = code
			onChange(code)
			run(code)
		})

		if (immediatelyEval) {
			run(code)
		}

		return () => {
			$editorFocused = false
			editor.dispose()
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
			editor.layout()
		})
	}}
>
	<div class="outer">
		{#if error}
			<div class="error">{error}</div>
		{/if}

		<div class="editor" bind:this={container}></div>

		<div class="controls">
			<button
				type="button"
				on:click={() => {
					const code = editor.getValue()

					console.log("compiling...")
					const runtimeCode = tsBlankSpace(code)
					console.log("... compile okay!")

					doEval(runtimeCode)
				}}>execute code</button
			>
			<label><input type="checkbox" bind:checked={evalOnChange} /> automatically execute on code change</label>
		</div>
	</div>
</Window>

<style>
	.error {
		color: pink;
		background: darkred;
		border: solid thin red;
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
