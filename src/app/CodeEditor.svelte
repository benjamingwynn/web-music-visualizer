<script lang="ts">
	import types from "./CodeEditorTypes.txt"
	import defaultText from "./CodeEditorDefault.txt"
	import * as monaco from "monaco-editor"
	import {onMount, getContext} from "svelte"
	import type {Writable} from "svelte/store"
	import tsBlankSpace from "ts-blank-space"
	import Window from "./Window.svelte"

	const editorFocused = getContext<Writable<boolean>>("editorFocused")

	let evalOnChange = true

	let container: HTMLElement
	var defaultCode = defaultText
	var jsCode = localStorage._editorValue ?? defaultCode

	let editor: monaco.editor.IStandaloneCodeEditor

	let error: string | undefined = undefined

	export const setCode = (code: string) => {
		editor.setValue(code)
	}

	function run() {
		const code = editor.getValue()
		localStorage._editorValue = code
		console.log("compiling...")
		const runtimeCode = tsBlankSpace(code)
		console.log("... compile okay!")

		if (evalOnChange) {
			console.log("evaluating...")
			try {
				eval(runtimeCode)
				error = undefined
				console.log("... runtime okay!")
			} catch (err: any) {
				console.log("... runtime error!")
				console.error(err)
				window._error = err
				error = _error.toString()
			}
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
			var libSource = types
			// console.log(types)
			// var libSource = ["declare class Facts {", "    /**", "     * Returns the next fact", "     */", "    static next():string", "}"].join("\n")
			var libUri = "ts:filename/myLib.d.ts"
			monaco.languages.typescript.javascriptDefaults.addExtraLib(libSource, libUri)
			// When resolving definitions and references, the editor will try to use created models.
			// Creating a model for the library allows "peek definition/references" commands to work with the library.
			monaco.editor.createModel(libSource, "typescript", monaco.Uri.parse(libUri))
		}

		editor = monaco.editor.create(container, {
			value: jsCode,
			language: "typescript",
			theme: "vs-dark",
			minimap: {
				enabled: false,
			},
		})
		// run()

		// Focus event
		editor.onDidFocusEditorText(() => {
			$editorFocused = true
			console.log("Editor is focused")
		})

		// Blur (unfocused) event
		editor.onDidBlurEditorText(() => {
			$editorFocused = false
			console.log("Editor lost focus")
		})

		editor.onKeyUp(() => {
			run()
		})

		return () => {
			$editorFocused = false
			editor.dispose()
		}
	})
</script>

<Window
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
			<button type="button">execute code</button>
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
