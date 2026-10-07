<script lang="ts">
</script>

<div class="frame">
	<div class="outer">
		<div class="inner"></div>
	</div>
</div>

<style>
	.frame {
		right: 0;
		bottom: 0;
		position: fixed;
	}

	.outer {
		width: 5em;
		height: 5em;
	}

	.inner {
		border-radius: 50%;
		border: solid transparent 0.5em;
		border-left-color: blue;
		width: 5em;
		height: 5em;
		animation: spin linear 700ms infinite;
		box-sizing: border-box;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>
