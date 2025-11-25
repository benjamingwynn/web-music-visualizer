<script lang="ts">
	import {onMount} from "svelte"

	window.nWindows = window.nWindows ? window.nWindows + 1 : 1

	let x = 20 * window.nWindows
	let y = 20 * window.nWindows
	let w = 500
	let h = 600

	export let hidden

	let titlebarHeight = 32

	let el: HTMLElement

	const resizeHitboxSize = 5
	type CardinalDirection = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw"
	let resizeHintDirection: CardinalDirection | null = null

	// snapshot taken at mousedown
	type ResizeStart = null | {
		sx: number // mouse start X
		sy: number // mouse start Y
		startX: number
		startY: number
		startW: number
		startHFull: number // full height (h + titlebarHeight)
		dir: CardinalDirection
	}

	let resizeStart: ResizeStart = null

	$: document.body.style.cursor = resizeStart ? resizeStart.dir + "-resize" : resizeHintDirection ? resizeHintDirection + "-resize" : "default"

	// During drag we keep the full window height (including title bar)
	let newX = x
	let newY = y
	let newWidth = w
	let newHeight = h + titlebarHeight

	let mouseX = 0
	let mouseY = 0

	let nextFrame: number

	let dragging: null | {
		sx: number
		sy: number
		startX: number
		startY: number
	} = null

	export let onResize = () => {}
	export let onClose = () => {}

	export let title = "window title"

	const MIN_WIDTH = 250
	const MIN_HEIGHT_FULL = 150 + titlebarHeight // full minimum including titlebar

	const frame = () => {
		if (resizeStart) {
			const {sx, sy, startX, startY, startW, startHFull, dir} = resizeStart
			const dx = mouseX - sx
			const dy = mouseY - sy

			// Start by assuming no change from the snapshot
			newX = startX
			newY = startY
			newWidth = startW
			newHeight = startHFull

			// EAST increases width
			if (dir.includes("e")) {
				newWidth = startW + dx
			}

			// WEST decreases width and moves left edge
			if (dir.includes("w")) {
				newWidth = startW - dx
				newX = startX + dx
			}

			// SOUTH increases height
			if (dir.includes("s")) {
				newHeight = startHFull + dy
			}

			// NORTH decreases height and moves top edge
			if (dir.includes("n")) {
				newHeight = startHFull - dy
				newY = startY + dy
			}

			// clamp sizes to minima (and fix positions if clamped)
			if (newWidth < MIN_WIDTH) {
				// if we're resizing from west, maintain right edge and clamp left
				const shortBy = MIN_WIDTH - newWidth
				newWidth = MIN_WIDTH
				if (dir.includes("w")) {
					// moving left produced too small width; move X back so right edge stays at original right
					newX -= shortBy
				}
			}

			if (newHeight < MIN_HEIGHT_FULL) {
				const shortBy = MIN_HEIGHT_FULL - newHeight
				newHeight = MIN_HEIGHT_FULL
				if (dir.includes("n")) {
					newY -= shortBy
				}
			}
		}

		if (dragging) {
			const {sx, sy, startX, startY} = dragging
			const dx = mouseX - sx
			const dy = mouseY - sy

			newX = startX + dx
			newY = startY + dy
		}

		nextFrame = requestAnimationFrame(frame)
	}

	onMount(() => {
		frame()
		return () => {
			cancelAnimationFrame(nextFrame)
		}
	})
</script>

<!-- events: note mousedown now stores a full snapshot -->
<svelte:window
	on:mousemove={(ev) => {
		mouseX = ev.clientX
		mouseY = ev.clientY

		const box = el.getBoundingClientRect()
		const east = ev.clientX >= box.right && ev.clientX <= box.right + resizeHitboxSize
		const west = ev.clientX <= box.left && ev.clientX >= box.left - resizeHitboxSize
		const south = ev.clientY >= box.bottom && ev.clientY <= box.bottom + resizeHitboxSize
		const north = ev.clientY <= box.top && ev.clientY >= box.top - resizeHitboxSize

		if (dragging) return

		if (north && east) {
			resizeHintDirection = "ne"
		} else if (north && west) {
			resizeHintDirection = "nw"
		} else if (south && east) {
			resizeHintDirection = "se"
		} else if (south && west) {
			resizeHintDirection = "sw"
		} else if (east) {
			resizeHintDirection = "e"
		} else if (west) {
			resizeHintDirection = "w"
		} else if (south) {
			resizeHintDirection = "s"
		} else if (north) {
			resizeHintDirection = "n"
		} else {
			resizeHintDirection = null
		}
	}}
	on:mousedown={(ev) => {
		if (resizeHintDirection) {
			ev.preventDefault()
			// snapshot the starting window rect (use full height)
			const startHFull = h + titlebarHeight
			resizeStart = {
				sx: ev.clientX,
				sy: ev.clientY,
				startX: x,
				startY: y,
				startW: w,
				startHFull,
				dir: resizeHintDirection,
			}
			// clear the hint so cursor logic moves to resizeStart cursor
			resizeHintDirection = null
		}
	}}
	on:mouseup={() => {
		if (resizeStart) {
			// commit new values back to the canonical x,y,w,h
			// newHeight is full height (including titlebar) so subtract titlebarHeight for `h`
			h = Math.max(MIN_HEIGHT_FULL - titlebarHeight, newHeight - titlebarHeight)
			w = Math.max(MIN_WIDTH, newWidth)
			x = newX
			y = newY
			onResize()
		}
		// finish dragging
		if (dragging) {
			x = newX
			y = newY
			dragging = null
		}
		resizeStart = null
	}}
/>

<div
	bind:this={el}
	class="window"
	style:--x={x}
	style:--y={y}
	style:--w={w}
	style:--h={h}
	role="dialog"
	{hidden}
	on:mouseleave={() => {
		resizeHintDirection = null
	}}
>
	<div
		class="titlebar"
		style:height="{titlebarHeight}px"
		role="heading"
		on:mousedown={(ev) => {
			// only start drag if not resizing
			if (!resizeHintDirection && !resizeStart) {
				ev.preventDefault()
				dragging = {
					sx: ev.clientX,
					sy: ev.clientY,
					startX: x,
					startY: y,
				}
			}
		}}
	>
		<div class="title">
			{title}
			<!-- <code>{resizeHintDirection}</code> <code>{mouseX}</code> <code>{mouseY}</code> -->
		</div>
		<div class="controls">
			<button
				class="control-close"
				type="button"
				on:mousedown={(ev) => {
					ev.preventDefault()
					ev.stopPropagation()
					onClose()
				}}>x</button
			>
		</div>
	</div>
	<div class="content">
		<slot />
	</div>
</div>

{#if resizeStart || dragging}
	<div class="placeholder" style:--x={newX} style:--y={newY} style:--w={newWidth} style:--h={newHeight}></div>
{/if}

<style lang="less">
	.window {
		outline: grey ridge 5px;
		position: fixed;
		top: calc(var(--y) * 1px);
		left: calc(var(--x) * 1px);
		box-shadow: 0px 0px 6px black;
	}

	.titlebar {
		display: flex;
		align-items: center;
		padding: 0 0.5em;
		cursor: move;
		user-select: none;
		background: rgba(0, 0, 0, 0.5);

		.controls {
			margin-left: auto;
		}
	}

	.content {
		background: black;
		width: calc(var(--w) * 1px);
		height: calc(var(--h) * 1px);
	}

	.placeholder {
		outline: dashed grey 3px;
		position: fixed;
		top: calc(var(--y) * 1px);
		left: calc(var(--x) * 1px);
		width: calc(var(--w) * 1px);
		height: calc(var(--h) * 1px);
	}
</style>
