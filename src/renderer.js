import { createClothSimulation } from './clothSimGPU.js';
import { updateCamera } from './camera.js';

async function loadShader(device, path) {
    const code = await fetch(path).then(r => r.text());
    return device.createShaderModule({ code });
}

function createIndexBuffer(device, indices) {
    const buffer = device.createBuffer({
        size: indices.byteLength,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
    });

    device.queue.writeBuffer(buffer, 0, indices);

    return buffer;
}

async function createPipeline(device, format, shaderFile, topology, fragmentEntry, vertexStride) {

    const shader = await loadShader(device, shaderFile);

    return device.createRenderPipeline({

        layout: "auto",

        vertex: {
            module: shader,
            entryPoint: "vertexMain",
            buffers: [{
                arrayStride: vertexStride,
                attributes: [{
                    shaderLocation: 0,
                    offset: 0,
                    format: "float32x3"
                }]
            }]
        },

        fragment: {
            module: shader,
            entryPoint: fragmentEntry,
            targets: [{ format }]
        },

        primitive: {
            topology
        }

    });

}

export async function createRenderer(device, context, format, grid, orbit, appSettings) {

    const simulation = await createClothSimulation(device, grid);
    const { vertexBuffer, vertexStride } = simulation;

    const triangleIndexBuffer = createIndexBuffer(device, grid.triangleIndices);
    const lineIndexBuffer = createIndexBuffer(device, grid.lineIndices);
    const cameraBuffer = device.createBuffer({
        size: 64,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    const fillPipeline = await createPipeline(
        device,
        format,
        "shaders/triangle.wgsl",
        "triangle-list",
        "fragmentMain",
        vertexStride
    );

    const linePipeline = await createPipeline(
        device,
        format,
        "shaders/line.wgsl",
        "line-list",
        "lineFragment",
        vertexStride
    );

    const cameraBindGroup = device.createBindGroup({
        layout: fillPipeline.getBindGroupLayout(0),
        entries: [
            {
                binding: 0,
                resource: { buffer: cameraBuffer }
            }
        ]
    });

    const lineCameraBindGroup = device.createBindGroup({
        layout: linePipeline.getBindGroupLayout(0),
        entries: [
            {
                binding: 0,
                resource: { buffer: cameraBuffer }
            }
        ]
    });

    const canvas = context.canvas;

    const MAX_DT = 1 / 30;
    let lastTime = performance.now() * 0.001;

    function render() {

        const time = performance.now() * 0.001;
        const dt = Math.min(time - lastTime, MAX_DT);
        lastTime = time;

        const acceleration = appSettings.hasGravity
            ? { x: 0, y: 0, z: -appSettings.gravity }
            : { x: 0, y: 0, z: 0 };

        const substeps = Math.max(1, appSettings.substeps);
        const subDt = dt / substeps;
        const waveZ = Math.sin(time * Math.PI * 2 * appSettings.frequency) * appSettings.amplitude;

        simulation.setParams({ dt: subDt, acceleration, waveZ });

        const encoder = device.createCommandEncoder();

        simulation.step(encoder, substeps);

        updateCamera(device, cameraBuffer, canvas, orbit);

        const renderPass = encoder.beginRenderPass({
            colorAttachments: [{
                view: context.getCurrentTexture().createView(),
                clearValue: { r: 0.1, g: 0.2, b: 0.8, a: 1 },
                loadOp: "clear",
                storeOp: "store"
            }]
        });

        renderPass.setVertexBuffer(0, vertexBuffer);

        renderPass.setBindGroup(0, cameraBindGroup);
        renderPass.setPipeline(fillPipeline);
        renderPass.setIndexBuffer(triangleIndexBuffer, "uint16");
        renderPass.drawIndexed(grid.triangleIndices.length);

        if (appSettings.hasWire) {
            renderPass.setBindGroup(0, lineCameraBindGroup);
            renderPass.setPipeline(linePipeline);
            renderPass.setIndexBuffer(lineIndexBuffer, "uint16");
            renderPass.drawIndexed(grid.lineIndices.length);
        }

        renderPass.end();

        device.queue.submit([encoder.finish()]);

        requestAnimationFrame(render);
    }

    return { render, constraintCount: simulation.constraintCount };
}
