<script>
	export let bg = "#77b55f"
</script>

<div style:--bg={bg}>
	<h3><slot /></h3>
</div>

<style>
	div {
		margin: 2rem;
		/* ^ debug */
		border: 1px #444 solid;
		padding: 0.2em 0.1em;
		font-size: 14px;
		background: var(--bg);
		display: inline-block;
	}

	h3 {
		font-size: 1.2em;
		color: #111;
		font-weight: 500;
		line-height: 1em;
		margin: 0;
	}
</style>
