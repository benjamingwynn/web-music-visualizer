/** @format */

import {MusicCanvas} from "../audio/canvas.ts"

const vertWGSL = `
struct Line {
	x1: f32,
	y1: f32,
	x2: f32,
	y2: f32,
	a: f32,
};

struct VertexOutput {
	@builtin(position) Position : vec4f,
	@location(0) color : vec4f,
};

struct Options {
	wRatio: f32,
	scale: f32,
	radius: f32
};

// note how binding 0 isn't used
@group(0) @binding(1) var<storage, read> roots: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read> targets: array<vec2<f32>>;
@group(0) @binding(3) var<storage, read> options: Options;
@group(0) @binding(4) var<storage, read> lines: array<Line>;
@group(0) @binding(5) var<storage, read> colors: array<vec4<f32>>;

fn calculate_line_with_width(x1: f32, y1: f32, x2: f32, y2: f32, width: f32, wRatio: f32) -> array<vec2<f32>, 6> {
	// Compute the direction vector (dx, dy)
	let dx = x2 - x1;
	let dy = y2 - y1;

	// Compute the length of the direction vector
	let length = sqrt(dx * dx + dy * dy);

	// Normalize the direction vector
	let dx_norm = dx / length;
	let dy_norm = dy / length;

	// Perpendicular vector (normal to the direction vector)
	let perp_dx = -dy_norm;
	let perp_dy = dx_norm;

	// Apply wRatio to the perpendicular vector to prevent stretching
	let adjusted_perp_dx = perp_dx * wRatio;
	let adjusted_perp_dy = perp_dy;

	// Half width
	let half_width = width / 2.0;

	// Calculate the four vertices
	let p1 = vec2<f32>(x1 + adjusted_perp_dx * half_width, y1 + adjusted_perp_dy * half_width);
	let p2 = vec2<f32>(x1 - adjusted_perp_dx * half_width, y1 - adjusted_perp_dy * half_width);
	let p3 = vec2<f32>(x2 + adjusted_perp_dx * half_width, y2 + adjusted_perp_dy * half_width);
	let p4 = vec2<f32>(x2 - adjusted_perp_dx * half_width, y2 - adjusted_perp_dy * half_width);

	// Return the six vertices that form two triangles
	return array(p1, p2, p3, p2, p3, p4);
}

@vertex
fn main(
	@builtin(vertex_index) renderIndex : u32
) -> VertexOutput {
	let rootIndex = renderIndex / 6u;
	let rootLength = arrayLength(&roots);
	let targetsLength = arrayLength(&targets);
	let targetIndex = rootIndex - rootLength;

	let linesLength = arrayLength(&lines);
	let lineIndex = rootIndex - rootLength - targetsLength;

	let vertexIndex = renderIndex % 6u;

	let shapeScale = options.scale;
	let canvasScale = 1 + (options.radius * 2);
	// let canvasScale = 0.8;

	let colorIndex = rootIndex % arrayLength(&colors);
	let colorFromIndex = colors[colorIndex];
	let r = colorFromIndex.r;
	let g = colorFromIndex.g;
	let b = colorFromIndex.b;

	if (rootIndex < rootLength) {
		// draw a root:
		let x1 = 2 * roots[rootIndex].x - 1;
		let y1 = 2 * -roots[rootIndex].y + 1;

		let size = 0.5 * shapeScale;

		let top = y1 - size;
		let right = x1 + (size * options.wRatio);
		let left = x1 - (size * options.wRatio);
		let bottom = y1 + size;

		let positions = array<vec2f, 6>(
			// triangle 1
			vec2(left, top),
			vec2(left, bottom),
			vec2(right, top),
			// triangle 2
			vec2(right, top),
			vec2(right, bottom),
			vec2(left, bottom),
		);

		let color = vec4f(1.0, 1.0, 1.0, 0.2);
		let position = vec4f(positions[vertexIndex] * canvasScale, 0, 1.0);

		return VertexOutput(position, color);
	} else if (targetIndex < targetsLength) {
		// draw a target:
		let x1 = 2 * targets[targetIndex].x - 1;
		let y1 = 2 * -targets[targetIndex].y + 1;

		let size = 0.5 * shapeScale;

		let top = y1 - size;
		let right = x1 + (size * options.wRatio);
		let left = x1 - (size * options.wRatio);
		let bottom = y1 + size;

		let positions = array<vec2f, 6>(
			// triangle 1
			vec2(left, top),
			vec2(left, bottom),
			vec2(right, top),
			// triangle 2
			vec2(right, top),
			vec2(right, bottom),
			vec2(left, bottom),
		);

		let color = vec4f(1.0, 1.0, 1.0, 0.15);
		let position = vec4f(positions[vertexIndex] * canvasScale, 0, 1.0);

		return VertexOutput(position, color);
	} else {
		// draw a line:
		let line = lines[lineIndex];
		let x1 = 2 * line.x1 - 1;
		let y1 = 2 * -line.y1 + 1;
		let x2 = 2 * line.x2 - 1;
		let y2 = 2 * -line.y2 + 1;

		let lineSize = 1.5;

		let positions = calculate_line_with_width(x1,y1,x2,y2, shapeScale * lineSize, options.wRatio);

		let color = vec4f(r, g, b, min(0.95, line.a));
		let position = vec4f(positions[vertexIndex] * canvasScale, 0, 1.0);

		return VertexOutput(position, color);
	}

}
`

const fragWGSL = `
@fragment
fn main(
	@location(0) color: vec4f
) -> @location(0) vec4f {
	// return vec4f(1.0, 1.0, 0.0, 0.1);
	return color;
}
`

const computeWGSL = `
struct Line {
	x1: f32,
	y1: f32,
	x2: f32,
	y2: f32,
	a: f32,
};

struct Options {
	wRatio: f32,
	scale: f32,
	radius: f32
};

@group(0) @binding(0) var<storage, read_write> rtn: array<Line>;
@group(0) @binding(1) var<storage, read_write> roots: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read_write> targets: array<vec2<f32>>;
@group(0) @binding(3) var<storage, read> options: Options;

@compute @workgroup_size(128) fn computeSomething(
@builtin(global_invocation_id) id: vec3u
) {
	let rootIndex = id.x;
	let targetIndex = id.y;

	if (rootIndex >= arrayLength(&roots) || targetIndex >= arrayLength(&targets)) {
		return;
	}

	let rtnIndex = rootIndex * arrayLength(&targets) + targetIndex;

	let rootX = roots[rootIndex].x;
	let rootY = roots[rootIndex].y;
	let targetX = targets[targetIndex].x;
	let targetY = targets[targetIndex].y;

	let dx = (targetX - rootX) / options.wRatio;
	let dy = targetY - rootY;

	let distance = sqrt(dx * dx + dy * dy);
	let maxD = options.radius;

	if (distance > maxD) {
		rtn[rtnIndex] = Line(0, 0, 0, 0, 0);
		return;
	}

	let normalizedDistance = 1 - (distance / maxD);
	// let normalizedDistance = 1 - min(distance / maxD, 1.0);

	rtn[rtnIndex] = Line(rootX, rootY, targetX, targetY, normalizedDistance);
}
`

MusicCanvas.registerVisualization("dotsAndLines", {
	info: {
		name: "Dots and Lines",
		author: "benjamin",
		description: "WebGPU port of the spotifystarfield.com visualization",
		gpu: "webgpu",
	},
	does: (masterCanvas, signal) => {
		// test different sizes for debugging
		const nRoots = 700
		const nTargets = 900
		const nColors = 700

		const smoothness = 0.82
		const movement = 0.0031

		let roots = new Float32Array(randomPositions(nRoots))
		let targets = new Float32Array(randomPositions(nTargets))
		let colors = new Float32Array(randomColors(nColors, "rainbow"))
		const rootVelocities = new Float32Array(nRoots)
		/**
		 * 1: north-west (top-left)
		 * 2: north (top)
		 * 3: north-east (top-right)
		 * 4: east (right)
		 * 5: south-east (bottom-right)
		 * 6: south (bottom)
		 * 7: south-west (bottom-left)
		 * 8: west (left)
		 */
		const rootDirections = new Uint8Array(randomDirections(nRoots))

		// for (let i = 0; i < 100; i++) {
		// 	rootVelocities[i] = 0.01
		// }

		const options = new Float32Array([
			// wRatio
			1,
			// scale
			0.003,
			// radius
			0.057,
		])

		let msCompute: number = 0
		let msDrawDebug: number = 0
		let msDraw: number = 0
		let msCopyIn: number = 0
		let msCopyOut: number = 0
		let msFrameTotal: number = 0
		// let nVertices: number = 0
		// let nLineVertices: number = 0
		// let nShapes: number = 0
		let debug0: string = "debug"
		let debug1: string = "debug"

		let debugAnimate = true
		let debugSpeed = 0.00008

		/** returns array of size n randomly containing 1-8 */
		function randomDirections(n: number) {
			return Array.from({length: Math.floor(n)}).map(() => Math.floor(Math.random() * 8) + 1)
		}
		function randomPositions(n = 750) {
			return Array.from({length: Math.floor(n * 2)}).map(() => Math.random())
		}
		function randomColors(n = 500, colorScheme: "rainbow" | "blue") {
			const threshold = 0.7
			let rtn: number[] = []
			for (let i = 0; i < n; i++) {
				let r = 0
				let g = 0
				let b = 0

				while (r < threshold && g < threshold && b < threshold) {
					r = Math.random()
					g = Math.random()
					b = Math.random()
				}

				const a = 1

				if (colorScheme == "blue") {
					rtn = [...rtn, Math.min(0.4, r), Math.min(0.4, g), Math.max(0.5, b), a]
				} else {
					rtn = [...rtn, r, g, b, a]
				}
			}
			return rtn
		}

		function draw2d(ctx: CanvasRenderingContext2D) {
			const t = Date.now()

			const debug = [
				//
				"debug",
				"lengths : " + roots.length / 2 + " roots, " + targets.length / 2 + " targets",
				"debug   : " + msDrawDebug + "ms",
				"draw    : " + msDraw + "ms",
				"total   : " + msFrameTotal + "ms",
				// "        : " + nLineVertices + " line vertices",
				// "        : " + nShapes + " shapes",
				// "        : " + nVertices + " vertices total",
				"compute : " + msCompute + "ms",
				"  cp in : " + msCopyIn + "ms",
				" cp out : " + msCopyOut + "ms",
				"mem in  : " + ((roots.byteLength + targets.byteLength) / 1024).toFixed(2) + "k",
				"options : " + options,
				"",
				debug0,
				debug1,
			]

			const fontSize = 11
			for (let i = 0; i < debug.length; i++) {
				ctx.font = fontSize * devicePixelRatio + "px monospace"
				ctx.strokeStyle = "black"
				ctx.strokeText(debug[i], 3, 4 + (fontSize - 1) * devicePixelRatio * (i + 1))
				// ctx.strokeText(debug[i], 0, 12 * (i + 1))
				ctx.fillStyle = "cyan"
				ctx.fillText(debug[i], 4, 4 + (fontSize - 1) * devicePixelRatio * (i + 1))
			}
			msDrawDebug = Date.now() - t
			// // console.timeEnd("draw2d")
		}

		let __init: ReturnType<typeof _init> | null = null
		async function _init() {
			const adapter = await navigator.gpu?.requestAdapter()
			const device = await adapter?.requestDevice({requiredLimits: {maxBufferSize: 1024 * 512}})
			if (!device) {
				throw new Error("need a browser that supports WebGPU")
			}

			return device
		}
		function init() {
			if (__init) return __init
			return (__init = _init())
		}

		function resize(ctx: GPUCanvasContext) {
			debug1 = ctx.canvas.height + "x" + ctx.canvas.width
			// set ratio
			options[0] = ctx.canvas.height / ctx.canvas.width
			const canvasSize = ctx.canvas.height * ctx.canvas.width
			// set shape size
			// options[1] = canvasSize / 1000000000
			// options[1] = canvasSize / 1000000000
			// options[1] = CANVAS_SHAPE_SIZE_MODIFIER / canvasSize
		}

		/** returns a promise of a function for rendering every frame */
		async function gpu(ctx: GPUCanvasContext, signal: AbortSignal) {
			resize(ctx)

			const device = await init()

			const presentationFormat = navigator.gpu.getPreferredCanvasFormat()
			ctx.configure({
				device,
				format: presentationFormat,
				alphaMode: "premultiplied",
			})

			const rootsSize = roots.length * Float32Array.BYTES_PER_ELEMENT
			const targetsSize = targets.length * Float32Array.BYTES_PER_ELEMENT
			const colorsSize = colors.length * Float32Array.BYTES_PER_ELEMENT

			const targetsBuffer = device.createBuffer({
				label: "targetsBuffer",
				size: targetsSize,
				usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX,
			})

			const rootsBuffer = device.createBuffer({
				label: "rootsBuffer",
				size: rootsSize,
				usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX,
			})

			const colorsBuffer = device.createBuffer({
				label: "colorsBuffer",
				size: colorsSize,
				usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX,
			})
			device.queue.writeBuffer(colorsBuffer, 0, colors)

			const optionsSize = options.length * Float32Array.BYTES_PER_ELEMENT
			const optionsBuffer = device.createBuffer({
				label: "optionsBuffer",
				size: optionsSize,
				usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX,
			})

			const nLineConnections = roots.length * targets.length
			const lineBufferSize = nLineConnections * 5 * Float32Array.BYTES_PER_ELEMENT
			const rtnBuffer = device.createBuffer({
				label: "rtnBuffer",
				size: lineBufferSize,
				usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX,
			})

			const computeBindGroupLayout = device.createBindGroupLayout({
				label: "computeBindGroupLayout",
				entries: [
					{
						binding: 0,
						visibility: GPUShaderStage.COMPUTE,
						buffer: {type: "storage"},
					},
					{
						binding: 1,
						visibility: GPUShaderStage.COMPUTE,
						buffer: {type: "storage"},
					},
					{
						binding: 2,
						visibility: GPUShaderStage.COMPUTE,
						buffer: {type: "storage"},
					},
					{
						binding: 3,
						visibility: GPUShaderStage.COMPUTE,
						buffer: {type: "read-only-storage"},
					},
				],
			})

			const computeBindGroupPipelineLayout = device.createPipelineLayout({
				label: "computeBindGroupPipelineLayout",
				bindGroupLayouts: [computeBindGroupLayout],
			})

			const renderBindGroupLayout = device.createBindGroupLayout({
				label: "renderBindGroupLayout",
				entries: [
					{
						binding: 0,
						visibility: GPUShaderStage.VERTEX,
						buffer: {type: "read-only-storage"},
					},
					{
						binding: 1,
						visibility: GPUShaderStage.VERTEX,
						buffer: {type: "read-only-storage"},
					},
					{
						binding: 2,
						visibility: GPUShaderStage.VERTEX,
						buffer: {type: "read-only-storage"},
					},
					{
						binding: 3,
						visibility: GPUShaderStage.VERTEX,
						buffer: {type: "read-only-storage"},
					},
					{
						binding: 4,
						visibility: GPUShaderStage.VERTEX,
						buffer: {type: "read-only-storage"},
					},
					{
						binding: 5,
						visibility: GPUShaderStage.VERTEX,
						buffer: {type: "read-only-storage"},
					},
				],
			})

			const renderBindGroupPipelineLayout = device.createPipelineLayout({
				label: "renderBindGroupPipelineLayout",
				bindGroupLayouts: [renderBindGroupLayout],
			})

			const renderPipeline = device.createRenderPipeline({
				label: "renderPipeline",
				// layout: unifiedBindGroupPipelineLayout,
				layout: renderBindGroupPipelineLayout,

				vertex: {
					buffers: [
						{
							arrayStride: 32,
							attributes: [
								{
									shaderLocation: 0,
									offset: 0,
									format: "float32x4",
								},
							],
						},
					],
					module: device.createShaderModule({
						code: vertWGSL,
					}),
				},
				fragment: {
					module: device.createShaderModule({
						code: fragWGSL,
					}),
					targets: [
						{
							format: presentationFormat,
							blend: {
								color: {
									// source: https://stackoverflow.com/a/72682494
									operation: "add",
									srcFactor: "src-alpha",
									dstFactor: "one-minus-src-alpha",
								},
								alpha: {
									// source: https://webgpufundamentals.org/webgpu/lessons/webgpu-transparency.html
									operation: "add",
									srcFactor: "one",
									dstFactor: "one-minus-src-alpha",
								},
							},
						},
					],
				},
				primitive: {
					topology: "triangle-list",
				},
			})

			const computePipeline = device.createComputePipeline({
				label: "computePipeline",
				layout: computeBindGroupPipelineLayout,
				compute: {
					module: device.createShaderModule({
						label: "computePipeline.module",
						code: computeWGSL,
					}),
				},
			})

			const computeResultBuffer = device.createBuffer({
				label: "computeResultBuffer",
				size: lineBufferSize,
				usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX,
			})

			signal.addEventListener("abort", () => {
				targetsBuffer.destroy()
				rootsBuffer.destroy()
				optionsBuffer.destroy()
				computeResultBuffer.destroy()
			})

			const nRoots = roots.length / 2
			const nTargets = targets.length / 2
			const nShapes = nRoots + nTargets
			const nShapeVertices = nShapes * 6 // 6 vertices per shape
			const nLines = nRoots * nTargets
			const nLineVertices = nLines * 6 // 6 vertices per line
			const drawPassCount = nShapeVertices + nLineVertices
			const bufferSize = drawPassCount * 32
			debug0 = nShapes + " shapes. dp: " + drawPassCount + ". buffer size: " + bufferSize / 1024 + "k"

			const drawBuffer = device.createBuffer({
				// i think this is a draw buffer but im not sure. it needs to be bigger the more stuff we draw, and its on bind 0 and not used by my shaders
				label: "drawBuffer",
				size: bufferSize,
				usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX,
			})

			// returns the function to render
			return () => {
				const tFrameStart = Date.now()
				signal.throwIfAborted()

				const tCopyStart = Date.now()

				device.queue.writeBuffer(rootsBuffer, 0, roots)
				device.queue.writeBuffer(targetsBuffer, 0, targets)
				device.queue.writeBuffer(optionsBuffer, 0, options)

				msCopyIn = Date.now() - tCopyStart

				const tComputeStart = Date.now()

				const computeBindGroup = device.createBindGroup({
					label: "computeBindGroup",
					layout: computeBindGroupLayout,
					entries: [
						{binding: 0, resource: {buffer: rtnBuffer}},
						{binding: 1, resource: {buffer: rootsBuffer}},
						{binding: 2, resource: {buffer: targetsBuffer}},
						{binding: 3, resource: {buffer: optionsBuffer}},
					],
				})

				// Encode commands to do the computation
				const encoder = device.createCommandEncoder({
					label: "encoder",
				})

				const computePass = encoder.beginComputePass({
					label: "computePass",
				})
				computePass.setPipeline(computePipeline)
				computePass.setBindGroup(0, computeBindGroup)
				computePass.dispatchWorkgroups(roots.length / 2, targets.length / 2) // divide by two for vec2
				computePass.end()
				msCompute = Date.now() - tComputeStart

				const tDrawStart = Date.now()

				// create a buffer on the GPU to get a copy of the results

				// Encode a command to copy the results to a mappable buffer.
				encoder.copyBufferToBuffer(rtnBuffer, 0, computeResultBuffer, 0, computeResultBuffer.size)

				// draw the result:
				const renderBindGroup = device.createBindGroup({
					label: "renderBindGroup",
					layout: renderBindGroupLayout,
					entries: [
						{binding: 0, resource: {buffer: drawBuffer}},
						{binding: 1, resource: {buffer: rootsBuffer}},
						{binding: 2, resource: {buffer: targetsBuffer}},
						{binding: 3, resource: {buffer: optionsBuffer}},
						{binding: 4, resource: {buffer: computeResultBuffer}},
						{binding: 5, resource: {buffer: colorsBuffer}},
					],
				})

				const textureView = ctx.getCurrentTexture().createView()

				const renderPassDescriptor: GPURenderPassDescriptor = {
					colorAttachments: [
						{
							view: textureView,
							clearValue: [0, 0, 0, 0], // Clear to transparent
							loadOp: "clear",
							storeOp: "store",
						},
					],
				}

				const passEncoderRender = encoder.beginRenderPass(renderPassDescriptor)
				passEncoderRender.setPipeline(renderPipeline)
				passEncoderRender.setBindGroup(0, renderBindGroup)
				passEncoderRender.setVertexBuffer(0, drawBuffer)
				passEncoderRender.setVertexBuffer(1, rootsBuffer)
				passEncoderRender.setVertexBuffer(2, targetsBuffer)
				passEncoderRender.setVertexBuffer(3, optionsBuffer)
				passEncoderRender.setVertexBuffer(4, computeResultBuffer)
				passEncoderRender.setVertexBuffer(5, colorsBuffer)

				passEncoderRender.draw(drawPassCount) // draw all the vertices

				passEncoderRender.end()

				device.queue.submit([encoder.finish()])

				msDraw = Date.now() - tDrawStart
				msFrameTotal = Date.now() - tFrameStart
			}
		}

		function physics(dT: number) {
			if (debugAnimate) {
				for (let i = 0; i < targets.length; i += 2) {
					targets[i + 0] += -debugSpeed * (i * 0.001)
					targets[i + 1] += -debugSpeed * (i * 0.001)

					if (targets[i + 0] <= 0) targets[i + 0] = 1
					if (targets[i + 1] <= 0) targets[i + 1] = 1
				}

				// with root directions
				for (let i = 0; i < roots.length; i += 2) {
					// roots[i + 0] += debugSpeed * (i * 0.001)
					// roots[i + 1] += debugSpeed * (i * 0.001)

					const vI = Math.floor(i / 2)
					const direction = rootDirections[vI]
					// if (rootVelocities[i] < 0.00001) rootVelocities[i] = 0

					let deltaX: number = 0
					let deltaY: number = 0

					switch (direction) {
						// top left
						case 1: {
							deltaX = -1
							deltaY = -1
							break
						}
						// top
						case 2: {
							deltaX = 0
							deltaY = -1
							break
						}
						// top right
						case 3: {
							deltaX = +1
							deltaY = -1
							break
						}
						// right
						case 4: {
							deltaX = 1
							deltaY = 0
							break
						}
						// bottom right
						case 5: {
							deltaX = +1
							deltaY = +1
							break
						}
						// bottom
						case 6: {
							deltaX = 0
							deltaY = +1
							break
						}
						// bottom left
						case 7: {
							deltaX = -1
							deltaY = +1
							break
						}
						// left
						case 8: {
							deltaX = -1
							deltaY = 0
							break
						}
						default:
							throw new Error("Unexpected direction")
					}

					roots[i + 0] += deltaX * debugSpeed
					roots[i + 1] += deltaY * debugSpeed

					if (rootVelocities[vI] > 0) {
						const v = rootVelocities[vI]
						rootVelocities[vI] = v * smoothness
						roots[i + 0] += deltaX * v
						roots[i + 1] += deltaY * v
					}

					// offscreen fix
					if (roots[i] >= 1) {
						roots[i] = 0
					} else if (roots[i] <= 0) {
						roots[i] = 1
					}
					// offscreen fix
					if (roots[i + 1] >= 1) {
						roots[i + 1] = 0
					} else if (roots[i + 1] <= 0) {
						roots[i + 1] = 1
					}
				}

				// with roots
				// for (let i = 0; i < roots.length; i += 1) {
				// 	// if (rootVelocities[i] > 0) {
				// 	// 	const direction = rootDirections[i]
				// 	// 	const delta = rootVelocities[i]
				// 	// 	rootVelocities[i] *= smoothness
				// 	// 	if (rootVelocities[i] > 0) rootVelocities[i] = 0
				// 	// 	roots[i] += delta
				// 	// }

				// }
				// for (let i = 0; i < roots.length; i += 2) {
				// 	// apply velocities
				// 	const xD = Math.max(maxVelocityPerFrame, rootVelocities[i + 0])
				// 	roots[i + 0] += xD
				// 	rootVelocities[i + 0] -= xD
				// 	rootVelocities[i + 1] -= roots[i + 1] += Math.max(maxVelocityPerFrame, rootVelocities[i + 1])

				// 	// offscreen fix
				// }
			}
		}

		const masterCtx = masterCanvas.getContext("2d")
		if (!masterCtx) throw new Error("cannot get 2d context")
		const canvas = document.createElement("canvas")
		const ctx = canvas.getContext("webgpu")
		if (!ctx) {
			masterCtx.fillStyle = "red"
			masterCtx.font = "36px monospace"
			masterCtx.fillText("Sorry, your browser does not support WebGPU", 36, 36)
		}
		// okay!
		let render: (() => void) | null = null
		gpu(ctx, signal).then((r) => {
			render = r
		})
		return (dT, music) => {
			canvas.height = masterCanvas.height
			canvas.width = masterCanvas.width
			masterCtx.fillStyle = "black"
			masterCtx.fillRect(0, 0, masterCanvas.width, masterCanvas.height)
			resize(ctx)
			physics(dT)
			if (!render) {
				masterCtx.fillStyle = "green"
				masterCtx.font = "36px monospace"
				masterCtx.fillText("Loading, please wait", 36, 36)
			} else {
				render()
			}
			masterCtx.drawImage(canvas, 0, 0)
			draw2d(masterCtx)
		}
	},
})
