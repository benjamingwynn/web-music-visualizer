<script lang="ts">
	import {collectionLoadState} from "./state"
</script>

<div hidden={!$collectionLoadState}>
	<h1>{$collectionLoadState ?? ""}</h1>
	<span class="o">
		<span class="i"></span>
	</span>
</div>

<style>
	div {
		display: flex;
		flex-flow: column nowrap;
		justify-content: center;
		align-items: center;
		gap: 2em;
		opacity: 1;
		transition: opacity 0.3s;
	}

	div[hidden] {
		opacity: 0;
	}

	h1 {
		font-size: 3em;
		font-weight: 200;
		margin: 0;
		text-align: center;
		white-space: nowrap;
		text-overflow: ellipsis;
		/* hack: shouldn't need to be 100vw to work */
		width: 100vw;
		overflow: hidden;
	}

	.o {
		width: 600px;
		height: 1px;
		display: block;
		box-shadow: hsl(196, 86%, 72%) 0px 0px 4px;
		overflow: visible;
		background: linear-gradient(45deg, transparent, azure, transparent);
	}

	.i {
		--size: 32px;
		width: var(--size);
		height: var(--size);
		display: block;
		animation: i infinite alternate 5s ease-in-out;
		background-image: radial-gradient(#00f3ff, transparent 65%);
		position: relative;
		top: calc((var(--size) / 2) * -1);
		left: calc((var(--size) / 2) * -1);
	}

	@keyframes i {
		0% {
			opacity: 0;
			transform: translateX(0px) scale(1);
		}

		20% {
			opacity: 0;
		}

		50% {
			opacity: 0.6;
			transform: translateX(300px) scale(1.5);
		}

		80% {
			opacity: 0;
		}

		100% {
			opacity: 0;
			transform: translateX(600px) scale(1);
		}
	}
</style>
