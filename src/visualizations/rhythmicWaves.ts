import {MusicCanvas} from "../audio/canvas.ts"

MusicCanvas.registerVisualization("rhythmic-waves", {
	info: {
		name: "Rhythmic Waves",
		author: "Gemini 2.5 Flash", // That's me!
		description: "Undulating lines react to the music's rhythm and intensity.",
	},
	does: (canvas) => {
		const ctx = canvas.getContext("2d")
		if (!ctx) throw new Error("Could not create 2D canvas context")

		// Configuration for the waves
		const numberOfWaves = 10 // How many waves to draw
		const waveBaseAmplitude = 0.05 // Base height of the waves (relative to canvas height)
		const waveSpeed = 0.00005 // Base speed of wave movement
		const waveColor = "rgba(0, 191, 255, 0.7)" // Base color (cyan with some transparency)
		const beatAmplitudeMultiplier = 2 // How much the amplitude increases on a beat
		const loudnessAmplitudeMultiplier = 0.5 // How much perceived loudness affects amplitude
		const colorChangeFactor = 0.1 // How much color changes with loudness/beat

		let waveOffset = 0 // To make the waves move

		// Array to hold wave properties (can add more complexity later if needed)
		const waves = Array.from({length: numberOfWaves}).map((_, index) => ({
			baseY: (index + 1) / (numberOfWaves + 1), // Vertical position of the wave (0 to 1)
			currentAmplitude: waveBaseAmplitude,
			currentColor: waveColor,
			phase: Math.random() * Math.PI * 2, // Random starting phase for variety
		}))

		return (deltaTime, music) => {
			// Clear the canvas
			ctx.clearRect(0, 0, canvas.width, canvas.height)

			// Update wave offset for movement
			waveOffset += waveSpeed * deltaTime
			if (waveOffset > Math.PI * 2) {
				waveOffset -= Math.PI * 2 // Loop the offset
			}

			// Update wave properties based on music data
			if (music && music.changed.beat && music.section.current) {
				const loudness = music.section.current.perceivedLoudness.avg || 0

				waves.forEach((wave) => {
					// Increase amplitude on beat, influenced by loudness
					wave.currentAmplitude = waveBaseAmplitude + beatAmplitudeMultiplier * loudness + loudnessAmplitudeMultiplier * loudness

					// Change color slightly on beat based on loudness
					const baseColor = [0, 191, 255] // Cyan RGB
					const colorOffset = Math.min(loudness * colorChangeFactor * 255, 100) // Max color change
					const newColor = `rgba(${Math.min(baseColor[0] + colorOffset, 255)}, ${Math.min(baseColor[1] + colorOffset, 255)}, ${Math.min(
						baseColor[2] + colorOffset,
						255
					)}, 0.7)`
					wave.currentColor = newColor
				})
			} else {
				// Decay amplitude and color back to base when no beat change
				waves.forEach((wave) => {
					wave.currentAmplitude = wave.currentAmplitude * Math.pow(0.98, deltaTime) + waveBaseAmplitude * (1 - Math.pow(0.98, deltaTime))
					// Simple color decay - could be more complex
					wave.currentColor = waveColor // Reset to base color for simplicity
				})
			}

			// Draw the waves
			ctx.lineWidth = 2 // Line thickness
			ctx.lineJoin = "round" // Smooth line joints

			waves.forEach((wave) => {
				ctx.beginPath()
				ctx.strokeStyle = wave.currentColor // Set stroke color

				// Start the line off-screen to the left
				ctx.moveTo(-10, wave.baseY * canvas.height)

				// Draw the wave using many small line segments
				const points = 100 // Number of points to define the wave shape
				for (let i = 0; i <= points; i++) {
					const x = (i / points) * canvas.width
					// Calculate y position using sine wave, influenced by amplitude and offset
					const y =
						wave.baseY * canvas.height +
						Math.sin((x / canvas.width) * Math.PI * 4 + waveOffset + wave.phase) * wave.currentAmplitude * canvas.height
					ctx.lineTo(x, y)
				}

				// End the line off-screen to the right
				ctx.lineTo(canvas.width + 10, wave.baseY * canvas.height)

				ctx.stroke() // Draw the wave
			})
		}
	},
})
