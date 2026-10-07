<script lang="ts">
	import Modal from "./Modal.svelte"

	let open = !navigator.userAgent.includes("Chrome/")
</script>

{#if open}
	<Modal>
		<h1>This works best in Chromium-based browsers</h1>
		<p>
			This <b>heavily</b> relies on extensive use of the WebAudio API, and some visualizations use WebGPU. Firefox and Safari have serious memory freeing
			issues with these APIs that can <b>cause your system to freeze up</b> or cause the application to become unresponsive.
		</p>
		<p>Unless you know what you're doing or have no other option, I'd strongly recommending using Chrome, Edge, Brave or another Chromium based browser.</p>
		<button
			type="button"
			on:click={() => {
				open = false
			}}>I know what I'm doing, continue.</button
		>
	</Modal>
{/if}
