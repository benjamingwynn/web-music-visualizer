<script lang="ts">
	import CodeEditor from "./CodeEditor.svelte"
	import LoadingCodeSpinner from "./LoadingCodeSpinner.svelte"

	export let url: string
	export let hidden: boolean
</script>

{#await fetch(url)}
	<LoadingCodeSpinner />
{:then f}
	{@const d = f.status === 200}
	{#await f.text()}
		<LoadingCodeSpinner />
	{:then code}
		{@const code2 = code.replace(/import .*/g, "")}
		<CodeEditor {url} title={url} code={(d ? "" : "// Error - ") + code2} {hidden}></CodeEditor>
	{/await}
{/await}
