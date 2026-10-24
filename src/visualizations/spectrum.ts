import {MusicCanvas} from "api"

MusicCanvas.registerVisualization("spectrum", {
	info: {
		name: "Spectrum",
		author: "Benjamin Gwynn",
		description: "Simple spectrum of the playing music.",
	},
	does: (masterCanvas: HTMLCanvasElement) => {
		const targets = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
		const targetsRender = [0.5, 0.4, 0.3, 0.5, 0.8, 0, 0, 0, 0, 0.5, 0, 0, 0, 0.4, 0, 0, 0.1, 0.2, 0.3, 0.4, 0, 0, 0, 0.3]

		let speed = 0.1
		const length = targets.length

		const subCanvases = Array.from({length: 5}).map(() => document.createElement("canvas"))
		const ctxs = subCanvases.map((canvas) => canvas.getContext("2d"))
		let frameCount = 0

		const masterCtx = masterCanvas.getContext("2d")

		return (deltaTime, music) => {
			frameCount++
			const canvasIndex = frameCount % subCanvases.length
			const t = deltaTime / 60

			for (let i = 0; i < length; i++) {
				if (music) {
					targets[i] = music.segment.current?.spectrum[i]
				}
				if (targets[i] > targetsRender[i]) targetsRender[i] += t * speed
				if (targets[i] < targetsRender[i]) targetsRender[i] -= t * speed
			}

			const subCanvas = subCanvases[canvasIndex]
			const ctx = ctxs[canvasIndex]

			const height = subCanvas.height
			const width = subCanvas.width
			// ctx.fillStyle = "rgba(0,0,0,0.01)"

			subCanvas.width = subCanvas.width
			ctx.font = "120px sans"
			ctx.fillStyle = "yellow"
			// ctx.fillText(length, 100, 200)
			// ctx.fillStyle = ""
			// ctx.fillRect(0, 0, width, height)

			ctx.strokeStyle = "red"
			ctx.lineWidth = 8

			const w = width / length
			let i = 0
			for (let x = 0; x < width; x += w) {
				const drawHeight = targetsRender[i]
				const h = height * drawHeight
				let y = height - h
				ctx.fillStyle = `hsla(${(x * 0.1) % 360}deg 100% 50% / ${Math.min(100, Math.ceil(100 / subCanvases.length) + 10)}%)`
				ctx.fillRect(x, y, w, h)
				i++
			}
			{
				const {width, height} = masterCtx.canvas
				if (subCanvas.width !== width) subCanvas.width = width
				if (subCanvas.height !== height) subCanvas.height = height
				// console.log(width,height)

				// ctx.drawImage(subCanvas, (width-(z*width))/2, height - (z*height), z*width, z*height)

				masterCtx.fillStyle = "black"
				masterCtx.fillRect(0, 0, width, height)

				let i = 0
				for (const subCanvas of subCanvases) {
					const z = 0.7 + 0.3 * ((subCanvases.length - i) / subCanvases.length)
					masterCtx.drawImage(subCanvas, (width - z * width) / 2, height - z * height, z * width, z * height)
					// ctx.drawImage(subCanvas, 0, height - (z*height), width, z*height)
					i++
				}
			}
			// ctx.drawImage(subCanvas, 0, 0)
			// demo
			// engine.configure({'budget': 5000 * Math.random()})
		}
	},
})
