<script lang="ts">
	export let hidden: boolean
</script>

<svg class:hidden xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="m6.427 4.427 3.396 3.396a.25.25 0 0 1 0 .354l-3.396 3.396A.25.25 0 0 1 6 11.396V4.604a.25.25 0 0 1 .427-.177Z" /></svg>

<style>
	svg {
		fill: #3ae7fd;
		filter: drop-shadow(0px 0px 2px rgb(2, 128, 128)) drop-shadow(2px 4px 6px black);
		height: 1em;
		opacity: 1;
		transition: opacity 0.15s;
	}

	svg.hidden {
		opacity: 0;
	}
</style>
