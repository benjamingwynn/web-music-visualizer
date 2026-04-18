/** @format */

import {MusicCanvas} from "../audio/canvas.ts"

/** util function for hue and saturation to [r,g,b] */
function hueSaturationToRGB(hue: number, saturation: number) {
	// clamp
	saturation = Math.max(0, Math.min(1, saturation))

	// magic
	hue = ((hue % 1) + 1) % 1
	const h6 = hue * 6

	const channel = (offset: number) => {
		let x = (((h6 + offset) % 6) + 6) % 6
		x = Math.abs(x - 3) - 1
		return x < 0 ? 0 : x > 1 ? 1 : x
	}

	const r0 = channel(0)
	const g0 = channel(4)
	const b0 = channel(2)

	const lerp = (a: number, b: number, t: number) => a + (b - a) * t

	const r = lerp(1, r0, saturation)
	const g = lerp(1, g0, saturation)
	const b = lerp(1, b0, saturation)

	return [r, g, b]
}

const vertWGSL = `
struct Line {
	x1: f32,
	y1: f32,
	x2: f32,
	y2: f32,
	r: f32,
	g: f32,
	b: f32,
	a: f32,
};

struct VertexOutput {
	@builtin(position) Position : vec4f,
	@location(0) color : vec4f,
};

struct Options {
	wRatio: f32,
	scale: f32,
	radius: f32,
	maxRadius: f32,
};

// note how binding 0 isn't used
@group(0) @binding(1) var<storage, read> roots: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read> targets: array<vec2<f32>>;
@group(0) @binding(3) var<storage, read> options: Options;
@group(0) @binding(4) var<storage, read> lines: array<Line>;

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
	let canvasScale = 1 + (options.maxRadius * 2);
	// let canvasScale = 0.8;

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

		let color = vec4f(1.0, 1.0, 1.0, 0.1);
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

		let color = vec4f(1.0, 1.0, 1.0, 0.2);
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

		let color = vec4f(line.r, line.g, line.b, min(0.99, line.a));
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
	r: f32,
	g: f32,
	b: f32,
	a: f32,
};

struct Options {
	wRatio: f32,
	scale: f32,
	radius: f32,
	maxRadius: f32,
};

@group(0) @binding(0) var<storage, read_write> rtn: array<Line>;
@group(0) @binding(1) var<storage, read_write> roots: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read_write> targets: array<vec2<f32>>;
@group(0) @binding(3) var<storage, read> options: Options;
@group(0) @binding(4) var<storage, read> colors: array<vec4<f32>>;

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
		rtn[rtnIndex] = Line(0, 0, 0, 0, 0, 0, 0, 0);
		return;
	}

	let normalizedDistance = 1 - (distance / maxD);

	let color = colors[targetIndex];
	let r = color.r;
	let g = color.g;
	let b = color.b;
	let a = min(color.a, normalizedDistance);

	rtn[rtnIndex] = Line(rootX, rootY, targetX, targetY, r, g, b, a);
}
`

MusicCanvas.registerVisualization("dotsAndLines", {
	info: {
		name: "Dots and Lines",
		author: "Benjamin Gwynn",
		description: "WebGPU port of my original spotifystarfield.com visualization",
		gpu: "webgpu",
		rating: 5,
	},
	does: (masterCanvas, signal) => {
		// test different sizes for debugging
		const nRoots = 900
		const nTargets = 700

		const smoothness = 0.9

		let roots = new Float32Array(randomPositions(nRoots))
		let targets = new Float32Array(randomPositions(nTargets))
		let colors = new Float32Array(makeColors(nTargets))
		const targetVelocities = new Float32Array(nTargets)
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
		const rootDirections = new Float32Array(randomDirections(nRoots))
		const targetDirections = new Float32Array(randomDirections(nTargets))

		const BEAT_STRENGTH_VELOCITY_MODIFIER = 0.0017

		const onBeat = (strength: number) => {
			for (let i = 0; i < targetVelocities.length; i++) {
				targetVelocities[i] = Math.min(1, strength) * BEAT_STRENGTH_VELOCITY_MODIFIER
			}
		}

		const MAX_RADIUS = 0.07
		const MIN_RADIUS = 0.015

		const options = new Float32Array([
			// wRatio
			1,
			// scale
			0.003,
			// radius
			0.007,
			// max radius
			MAX_RADIUS,
		])

		let targetRadius: number = MAX_RADIUS
		let radiusChangeSpeed = 0.00002
		/** 0-1 */
		function setRadius(radius: number) {
			targetRadius = Math.max(MIN_RADIUS, Math.min(1, radius) * MAX_RADIUS)
		}

		let enableDrawDebug = false
		let msCompute: number = 0
		let msDrawDebug: number = 0
		let msDraw: number = 0
		let msCopyIn: number = 0
		let msCopyOut: number = 0
		let msFrameTotal: number = 0
		let msPhysics: number = 0
		// let nVertices: number = 0
		// let nLineVertices: number = 0
		// let nShapes: number = 0
		let debug0: string = "debug"
		let debug1: string = "debug"
		let debug2: string = "debug"
		let debug3: string = "debug"
		let debug4: string = "debug"
		// let debug: string = []

		let WORLD_SPEED = 0.0001
		let floatSpeed = 0.5
		let opacityIncreaseSpeed = 0.001

		let useOutOfRangeTargets = false
		const outOfRangeTargets = new Set<number>()

		let warpEffectEnabled = true
		const WARP_EFFECT_SPEED_MAX = 10.5e-5
		let warpEffectSpeedActual = 0
		let warpEffectSpeedTarget = 0
		let warpEffectChangeSpeed = 2.3e-8
		let rotateSpeedActual = 0
		let rotateSpeedTarget = 0
		let rotateChangeSpeed = 0.0001

		let angle = 0

		// HACK: debugging
		const onClick = (ev) => {
			if (ev.shiftKey) {
				enableDrawDebug = !enableDrawDebug
			}
		}
		document.addEventListener("click", onClick)
		signal.addEventListener("abort", () => {
			document.removeEventListener("click", onClick)
		})
		// < end debug hack

		function rotatePoints(points: Float32Array, angle: number, ratio: number) {
			if (angle === 0) return
			const c = Math.cos(angle)
			const s = Math.sin(angle)

			for (let i = 0; i < points.length; i += 2) {
				let x = points[i]
				let y = points[i + 1]

				const tx = x - 0.5
				const ty = (y - 0.5) * ratio

				// Rotate
				const rx = c * tx - s * ty
				const ry = s * tx + c * ty

				// Undo aspect ratio and translation
				points[i] = rx + 0.5
				points[i + 1] = ry / ratio + 0.5
			}
		}

		/** returns array of size n randomly containing 1-8 */
		function randomDirections(n: number) {
			return Array.from({length: Math.floor(n)}).map(() => Math.random())
		}
		function randomPositions(n = 750) {
			return Array.from({length: Math.floor(n * 2)}).map(() => Math.random())
		}
		function makeColors(n: number) {
			let rtn: number[] = []
			for (let i = 0; i < n; i++) {
				let r = 0.25
				let g = 0.25
				let b = 0.25

				// while (r < threshold && g < threshold && b < threshold) {
				// 	r = Math.random()
				// 	g = Math.random()
				// 	b = Math.random()
				// }

				const a = 0

				rtn = [...rtn, r, g, b, a]
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
				"compute : " + msCompute + "ms",
				"draw    : " + msDraw + "ms",
				"render  : " + msFrameTotal + "ms",
				"physics : " + msPhysics + "ms",
				// "        : " + nLineVertices + " line vertices",
				// "        : " + nShapes + " shapes",
				// "        : " + nVertices + " vertices total",
				"  cp in : " + msCopyIn + "ms",
				" cp out : " + msCopyOut + "ms",
				"mem in  : " + ((roots.byteLength + targets.byteLength) / 1024).toFixed(2) + "k",
				"options : " + options,
				"respawn : " + useOutOfRangeTargets + " / " + outOfRangeTargets.size,
				"warp    : " + warpEffectEnabled + " / " + warpEffectChangeSpeed + " / " + warpEffectSpeedTarget + " / " + warpEffectSpeedActual,
				"rotate  : " + rotateSpeedTarget + " / " + rotateChangeSpeed + " / " + rotateSpeedActual,
				,
				"",
				debug0,
				debug1,
				debug2,
				debug3,
				debug4,
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
						// rtn
						binding: 0,
						visibility: GPUShaderStage.COMPUTE,
						buffer: {type: "storage"},
					},
					{
						//roots
						binding: 1,
						visibility: GPUShaderStage.COMPUTE,
						buffer: {type: "storage"},
					},
					{
						//targets
						binding: 2,
						visibility: GPUShaderStage.COMPUTE,
						buffer: {type: "storage"},
					},
					{
						//options
						binding: 3,
						visibility: GPUShaderStage.COMPUTE,
						buffer: {type: "read-only-storage"},
					},
					{
						//colors
						binding: 4,
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
				device.queue.writeBuffer(colorsBuffer, 0, colors)

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
						{binding: 4, resource: {buffer: colorsBuffer}},
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

				passEncoderRender.draw(drawPassCount) // draw all the vertices

				passEncoderRender.end()

				device.queue.submit([encoder.finish()])

				msDraw = Date.now() - tDrawStart
				msFrameTotal = Date.now() - tFrameStart
			}
		}

		function deltasFromDirection(direction: number): [number, number] {
			if (direction < 0 || direction > 1) {
				throw new Error("Direction must be between 0 and 1 (normalized angle).")
			}

			const angle = direction * 2 * Math.PI // Convert normalized value to radians

			const deltaX = Math.cos(angle) * options[0]
			const deltaY = Math.sin(angle)

			return [deltaX, deltaY] as const
		}

		function physics(dT: number) {
			// angle+= dT * 0.0001
			rotatePoints(roots, 0.00005 * dT * rotateSpeedActual, options[0])
			rotatePoints(targets, 0.00005 * dT * rotateSpeedActual, options[0])

			if (warpEffectEnabled) {
				for (let i = 0; i < targets.length; i += 2) {
					const cx = 0.5
					const cy = 0.5
					const zx = (targets[i + 0] - cx) * Math.E * warpEffectSpeedActual * dT * options[0]
					const zy = (targets[i + 1] - cy) * Math.E * warpEffectSpeedActual * dT

					targets[i + 0] += zx
					targets[i + 1] += zy
				}
				// for (let i = 0; i < roots.length; i += 2) {
				// 	const cx = 0.5
				// 	const cy = 0.5
				// 	const zx = (roots[i + 0] - cx) * Math.E * warpEffectSpeedActual * dT
				// 	const zy = (roots[i + 1] - cy) * Math.E * warpEffectSpeedActual * dT

				// 	roots[i + 0] += zx
				// 	roots[i + 1] += zy
				// }
			}
			// debug1 = roots[0].toFixed(2) + "," + roots[1].toFixed(2)

			for (let i = 0; i < targets.length; i += 2) {
				const vI = Math.floor(i / 2)
				if (useOutOfRangeTargets && outOfRangeTargets.has(vI)) {
					continue
				}
				const direction = targetDirections[vI]
				const [deltaX, deltaY] = deltasFromDirection(direction)

				targets[i + 0] += deltaX * (WORLD_SPEED * floatSpeed)
				targets[i + 1] += deltaY * (WORLD_SPEED * floatSpeed)

				if (targetVelocities[vI] > 0) {
					const v = targetVelocities[vI]
					targetVelocities[vI] = v * smoothness
					targets[i + 0] += deltaX * v
					targets[i + 1] += deltaY * v
				}

				const outOfRange = () => {
					outOfRangeTargets.add(vI)
				}

				const loop = (fn: () => void) => {
					fn()

					// const [r, g, b, a] = possibleNewColors[Math.floor(possibleNewColors.length * Math.random())]
					const [r, g, b, a] = [0.25, 0.25, 0.25, 0]
					const colorIndex = vI * 4
					colors[colorIndex + 0] = r
					colors[colorIndex + 1] = g
					colors[colorIndex + 2] = b
					colors[colorIndex + 3] = a
				}

				// offscreen fix (X)
				if (targets[i + 0] < 0) useOutOfRangeTargets ? outOfRange() : loop(() => (targets[i + 0] = 1))
				else if (targets[i + 0] > 1) useOutOfRangeTargets ? outOfRange() : loop(() => (targets[i + 0] = 0))
				// offscreen fix (Y)
				if (targets[i + 1] < 0) useOutOfRangeTargets ? outOfRange() : loop(() => (targets[i + 1] = 1))
				else if (targets[i + 1] > 1) useOutOfRangeTargets ? outOfRange() : loop(() => (targets[i + 1] = 0))
			}

			// with root directions
			for (let i = 0; i < roots.length; i += 2) {
				const vI = Math.floor(i / 2)
				const direction = rootDirections[vI]

				const [deltaX, deltaY] = deltasFromDirection(direction)

				roots[i + 0] += deltaX * (WORLD_SPEED * floatSpeed)
				roots[i + 1] += deltaY * (WORLD_SPEED * floatSpeed)

				// const backToCenter = () => {
				// 	roots[i + 0] = 0.5
				// 	roots[i + 1] = 0.5
				// }

				// offscreen fix (X)
				if (roots[i + 0] < 0) /*warpEffectEnabled ? backToCenter() :*/ roots[i + 0] = 1
				else if (roots[i + 0] > 1) /*warpEffectEnabled ? backToCenter() :*/ roots[i + 0] = 0
				// offscreen fix (Y)
				if (roots[i + 1] < 0) /*warpEffectEnabled ? backToCenter() :*/ roots[i + 1] = 1
				else if (roots[i + 1] > 1) /*warpEffectEnabled ? backToCenter() :*/ roots[i + 1] = 0
			}

			// increase alpha of colors
			for (let i = 0; i < nTargets; i++) {
				const aI = i * 4 - 1
				if (colors[aI] < 1) colors[aI] += opacityIncreaseSpeed * dT
				if (colors[aI] > 1) colors[aI] = 1
				// console.log(colors[aI])
			}

			// change warp speed
			if (warpEffectSpeedActual < warpEffectSpeedTarget) {
				warpEffectSpeedActual += warpEffectChangeSpeed * dT
			} else if (warpEffectSpeedActual > warpEffectSpeedTarget) {
				warpEffectSpeedActual -= warpEffectChangeSpeed * dT
			}
			// trying to get to 0, so turn off warp once we're there
			if (warpEffectSpeedTarget === 0 && warpEffectSpeedActual <= 0) {
				warpEffectSpeedActual = 0
				warpEffectEnabled = false
			}
			if (warpEffectSpeedActual > WARP_EFFECT_SPEED_MAX) {
				// fix warp thats too high from a very big frame time
				warpEffectSpeedActual = WARP_EFFECT_SPEED_MAX
			}

			// change rotate speed
			if (rotateSpeedActual < rotateSpeedTarget) {
				rotateSpeedActual += rotateChangeSpeed * dT
			} else if (rotateSpeedActual > rotateSpeedTarget) {
				rotateSpeedActual -= rotateChangeSpeed * dT
			}

			if (rotateSpeedActual <= 0) {
				rotateSpeedActual = 0
			}

			// change radius to target
			if (options[2] < targetRadius) {
				options[2] += radiusChangeSpeed * dT
				if (options[2] > targetRadius) options[2] = targetRadius
			} else if (options[2] > targetRadius) {
				options[2] -= radiusChangeSpeed * dT
				if (options[2] < targetRadius) options[2] = targetRadius
			}
		}

		const masterCtx = masterCanvas.getContext("2d")
		if (!masterCtx) throw new Error("cannot get 2d context")
		const canvas = document.createElement("canvas")
		const ctx = canvas.getContext("webgpu")
		if (!ctx) {
			return () => {
				masterCanvas.width = masterCanvas.width
				masterCtx.fillStyle = "red"
				masterCtx.font = "36px monospace"
				masterCtx.fillText("Sorry, your browser does not support WebGPU.", 36, masterCanvas.height / 2)
			}
		}
		// okay!
		let render: (() => void) | null = null
		gpu(ctx, signal).then((r) => {
			render = r
		})
		let possibleNewColors: [number, number, number, number][] = []
		return (dT, music) => {
			canvas.height = masterCanvas.height
			canvas.width = masterCanvas.width
			masterCtx.fillStyle = "black"
			masterCtx.fillRect(0, 0, masterCanvas.width, masterCanvas.height)
			resize(ctx)
			debug0 = possibleNewColors.length + " colors"
			const msPhysicsStart = performance.now()
			physics(dT)
			msPhysics = performance.now() - msPhysicsStart
			const addOutOfRange = () => {
				const targetsToMove = [...outOfRangeTargets.values()]
				for (const moveTargetIndex of targetsToMove) {
					// all of them?
					if (moveTargetIndex !== undefined) {
						const moveXyIndex = moveTargetIndex * 2

						const respawnXyIndex = Math.floor((roots.length / 2) * Math.random())
						targets[moveXyIndex + 0] = roots[respawnXyIndex + 0]
						targets[moveXyIndex + 1] = roots[respawnXyIndex + 1]

						// setup new color based on possible colors
						if (possibleNewColors.length) {
							const [r, g, b, a] = possibleNewColors[Math.floor(possibleNewColors.length * Math.random())]
							const colorIndex = moveTargetIndex * 4
							colors[colorIndex + 0] = r
							colors[colorIndex + 1] = g
							colors[colorIndex + 2] = b
							colors[colorIndex + 3] = a
						}

						outOfRangeTargets.delete(moveTargetIndex)
					}
				}
			}
			if (!render) {
				masterCtx.fillStyle = "green"
				masterCtx.font = "36px monospace"
				masterCtx.fillText("Loading, please wait", 36, 36)
			} else {
				// react to music here

				useOutOfRangeTargets = Boolean(music?.section.current) || warpEffectEnabled
				if (music) {
					if (warpEffectEnabled) {
						if (music.changed.tatum && music.tatum.current && music.segment.current) {
							onBeat(music.tatum.current?.confidence * 0.5 * (warpEffectSpeedTarget === 0 ? 1 : 0.7182818284590451))
						}
					} else {
						if (music.changed.beat && music.beat.current && music.segment.current) {
							onBeat(music.beat.current?.perceivedLoudness * (warpEffectSpeedTarget === 0 ? 1 : 0.7182818284590451))
						}
					}
					debug4 = "loudness:" + music.segment.current?.perceivedLoudness

					if (music.section.current && music.segment.current && (music.changed.section || !possibleNewColors.length)) {
						floatSpeed = 1 - music.section.current.perceivedLoudness.avg
						const candidates: [number, number, number, number][] = []
						for (let i = 0; i < music.section.current.keys.length; i++) {
							const confidence = music.section.current.keys[i]
							const complexity = 60
							const addsCandidates = Math.floor(confidence * complexity)
							const variance = 0.5
							const hue = ((i + 12) % 24) / 24
							for (let _ = 0; _ < addsCandidates; _++) {
								const [r, g, b] = hueSaturationToRGB(hue, 1 - variance + variance * Math.random())
								const alpha = 0
								const candidate: [number, number, number, number] = [r, g, b, alpha]
								// console.log("ADD candidate:", candidate)
								candidates.push(candidate)
							}
						}
						if (candidates.length) possibleNewColors = candidates
					}

					if ((warpEffectEnabled && music.changed.beat) || (!warpEffectEnabled && music.changed.tatum)) {
						// move an out of range target onto a root when a tatum happens
						addOutOfRange()
					}

					if (music.segment.current) {
						setRadius(music.segment.current.perceivedLoudness * 2)
					}

					let warpReason = null
					if (music.section.current) {
						if (music.section.current.perceivedLoudness.min < 0.03) warpReason = "perceivedLoudness.min < 0.03"
						if (music.section.current.perceivedLoudness.avg < 0.25) warpReason = "perceivedLoudness.avg < 0.25"
						if (music.section.current.bpm.avg < 90) warpReason = "bpm.avg < 0.25"
						debug3 = "perceivedLoudness.min=" + music.section.current.perceivedLoudness.avg

						// rotateSpeedTarget = Math.min(music.section.current.bpm.avg, 180) / 180
						if (warpReason) {
							rotateSpeedTarget = (Math.min(music.section.current.bpm.avg, 180) / 180) * Math.E
						} else {
							rotateSpeedTarget = Math.min(music.section.current.bpm.avg, 180) / 180
						}
					}
					if (warpReason) {
						warpEffectSpeedTarget = WARP_EFFECT_SPEED_MAX * (1 - (music.section.current?.perceivedLoudness.avg ?? 1))
						warpEffectEnabled = true
						debug2 = warpReason
					} else {
						warpEffectSpeedTarget = 0
						debug2 = "no warp reason"
					}
				} else {
					warpEffectSpeedTarget = 0
					rotateSpeedTarget = 0
					setRadius(0.5)
					addOutOfRange()
				}

				render()
			}
			masterCtx.drawImage(canvas, 0, 0)
			if (enableDrawDebug) {
				draw2d(masterCtx)
			}
		}
	},
})
