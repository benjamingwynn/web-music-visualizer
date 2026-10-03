<script lang="ts">
	export let onClick: () => Promise<void>
	export let disabled = false
	let lock = false
</script>

<button
	disabled={lock || disabled}
	type="button"
	on:click={() => {
		lock = true
		onClick().finally(() => {
			lock = false
		})
	}}><slot /></button
>

<style>
	button {
		background: #333;
		color: white;
	}
</style>
