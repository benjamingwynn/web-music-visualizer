<script lang="ts">
</script>

<div class="m-outer">
	<div class="m-inner">
		<slot />
	</div>
</div>

<style>
	.m-outer {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.8);
		display: flex;
		z-index: 1;
	}

	.m-inner {
		color: white;
		background: #111;
		margin: auto;
		max-width: 600px;
		padding: 1em 1.5em;
		box-shadow: rgba(0, 0, 0, 0.8) 0 0;
	}
</style>
