<script lang="ts">
	import * as monaco from "monaco-editor"
	import {onMount, getContext} from "svelte"
	import type {Writable} from "svelte/store"

	const editorFocused = getContext<Writable<boolean>>("editorFocused")

	let container: HTMLElement
	export let code: string
	export let onChange = (code: string) => {}
	export let debounceMs = 1_000

	let editor: monaco.editor.IStandaloneCodeEditor
	let timer: ReturnType<typeof setTimeout>

	export const setValue = (code: string) => {
		editor.setValue(code)
	}

	export const getValue = () => editor.getValue()

	export const layout = () => {
		editor?.layout()
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
		}

		// async fork to go get the backend types and add them into the editor
		;(async () => {
			const ts = monaco.languages.typescript
			// validation settings
			ts.typescriptDefaults.setDiagnosticsOptions({
				noSemanticValidation: false,
				noSyntaxValidation: false,
			})

			console.log("fetching types from backend...")
			const musiqTypes = await (await fetch("/musiq/dist/musiq.d.ts")).text()
			const ourTypes = await (await fetch("/api.d.ts")).text()
			console.log("got backend types!")

			// compiler options
			ts.typescriptDefaults.setCompilerOptions({
				target: ts.ScriptTarget.ES2020,
				module: ts.ModuleKind.ESNext,
				moduleResolution: ts.ModuleResolutionKind.NodeJs,
				allowNonTsExtensions: true,
				allowUmdGlobalAccess: true,
			})

			ts.typescriptDefaults.addExtraLib(musiqTypes, "file:///node_modules/musiq/index.d.ts")

			ts.typescriptDefaults.addExtraLib(ourTypes, "file:///node_modules/MusicCanvas/index.d.ts")
		})()

		editor = monaco.editor.create(container, {
			value: code,
			language: "typescript",
			theme: "vs-dark",
			minimap: {
				enabled: false,
			},
		})

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

		// fires on real edits only (typing, paste, undo, find/replace, etc), debounced
		// so half-typed code doesn't get evaluated mid-keystroke
		editor.onDidChangeModelContent((e) => {
			if (e.isFlush) return // setValue(), not a user edit
			clearTimeout(timer)
			timer = setTimeout(() => onChange(editor.getValue()), debounceMs)
		})

		return () => {
			clearTimeout(timer)
			$editorFocused = false
			editor.dispose()
		}
	})
</script>

<div class="monaco" bind:this={container}></div>

<style>
	.monaco {
		height: 100%;
	}
</style>
