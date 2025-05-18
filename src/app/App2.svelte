<script>
	import Alert from "./Alert.svelte"
	import {loadMusiq} from "../audio/musiq.ts"
</script>

<div class="h">
	<div class="hx">
		<h3>program is loading please wait the program is loading please wait the program is loading please wait the program is loading</h3>
		<h1>demo visualization system</h1>
		<h2>loading the models for music processing</h2>
	</div>
</div>

<Alert>This is a test alert that represents everything is okay.</Alert>
<Alert bg="#e89017">This is a test alert for something not being okay.</Alert>
<Alert bg="#cc4e01">This is a test alert for a thing having gone very wrong.</Alert>
<Alert bg="#e5da59">This is a test alert for some sort of warning.</Alert>

<button
	on:click={() => {
		loadMusiq()
	}}
	type="button">test</button
>

<style>
	.h {
		background: #cc4e01;
	}

	.h::before {
		content: "";
		display: block;
		height: 3.15em;
		background: #c50036;
		border-bottom: solid 0.2em #e8ac17;
	}

	.hx {
		padding: 0.8em 1.1em;
	}

	h1,
	h2,
	h3 {
		margin: 0;
		font-size: 1em;
		text-align: right;
		line-height: 1.8ex;
	}

	h3 {
		color: #eabc14;
		font-weight: 300;
		margin-bottom: 0.2ex;
	}

	h1 {
		color: hsl(53, 100%, 91%);
		font-weight: 800;
		font-size: 4.04em;
		text-transform: uppercase;
	}

	h2 {
		color: #eabc14;
		font-weight: 300;
		font-size: 1.65em;
		text-transform: uppercase;
	}
</style>
