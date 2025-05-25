import {MusicCanvas} from "../audio/canvas.ts"

MusicCanvas.registerVisualization("test", {
	info: {
		name: "Name of my visualization",
		author: "My Name",
		description: "This is a description.",
	},
	does: (canvas) => {
		return (dt, music) => {}
	},
})
