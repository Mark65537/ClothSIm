import { vertexToArray, computeNormals } from './grid.js';
import { createConstraints, solveConstraints, restorePinnedVertices } from './constraint.js';
import { integrate, syncOldPositions } from './integrator.js';
import { updateCamera } from './camera.js';
let clothVertices = [];

async function loadShader(device, path) {
    const code = await fetch(path).then(r => r.text());
    return device.createShaderModule({ code });
}

function updateVertexBuffer(device, vertexBuffer, cols, rows) {
    const normals = computeNormals(clothVertices, cols, rows);
    const gpuVertices = vertexToArray(clothVertices, normals);
    device.queue.writeBuffer(vertexBuffer, 0, gpuVertices);
}

function createVertexBuffer(device, vertices) {
    const buffer = device.createBuffer({
        size: vertices.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });

    device.queue.writeBuffer(buffer, 0, vertices);

    return buffer;
}

function createIndexBuffer(device, indices) {
    const buffer = device.createBuffer({
        size: indices.byteLength,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
    });

    device.queue.writeBuffer(buffer, 0, indices);

    return buffer;
}

async function createPipeline(device, format, shaderFile, topology, fragmentEntry, vertexBuffers) {

    const shader = await loadShader(device, shaderFile);

    return device.createRenderPipeline({

        layout: "auto",

        vertex: {
            module: shader,
            entryPoint: "vertexMain",
            buffers: vertexBuffers
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

const positionNormalLayout = [{
    arrayStride: 24,
    attributes: [
        { shaderLocation: 0, offset: 0, format: "float32x3" },
        { shaderLocation: 1, offset: 12, format: "float32x3" }
    ]
}];

const positionLayout = [{
    arrayStride: 24,
    attributes: [
        { shaderLocation: 0, offset: 0, format: "float32x3" }
    ]
}];

export async function createRenderer(device, context, format, grid, orbit, appSettings) {

    clothVertices = grid.vertices;// Все вершины в типе Vertex
    const normals = computeNormals(clothVertices, grid.COLS, grid.ROWS);
    const gpuVertices = vertexToArray(clothVertices, normals);
    const constraints = createConstraints(clothVertices, grid.COLS, grid.ROWS);

    const vertexBuffer = createVertexBuffer(device, gpuVertices);

    const triangleIndexBuffer = createIndexBuffer(device, grid.triangleIndices);
    const lineIndexBuffer = createIndexBuffer(device, grid.lineIndices);
    const cameraBuffer = device.createBuffer({
        size: 64, // mat4x4<f32>
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    

    const fillPipeline = await createPipeline(
        device,
        format,
        "shaders/triangle.wgsl",
        "triangle-list",
        "fragmentMain",
        positionNormalLayout
    );

    const linePipeline = await createPipeline(
        device,
        format,
        "shaders/line.wgsl",
        "line-list",
        "lineFragment",
        positionLayout
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

    const center = grid.drivenIndex;

    const CONSTRAINT_ITERATIONS = 5;
    const MAX_DT = 1 / 30;
    let lastTime = performance.now() * 0.001;

    function render() {

        // UPDATE
        const time = performance.now() * 0.001;
        const dt = Math.min(time - lastTime, MAX_DT);
        lastTime = time;

        const acceleration = appSettings.hasGravity
            ? { x: 0, y: 0, z: -appSettings.gravity}
            : { x: 0, y: 0, z: 0 };

        const substeps = Math.max(1, appSettings.substeps);
        const subDt = dt / substeps;
        const waveZ = Math.sin(time * Math.PI * 2 * appSettings.frequency) * appSettings.amplitude;

        for (let s = 0; s < substeps; s++) {
            integrate(clothVertices, subDt, acceleration);

            clothVertices[center].position.z = waveZ;

            for (let i = 0; i < CONSTRAINT_ITERATIONS; i++) {
                solveConstraints(clothVertices, constraints);
                restorePinnedVertices(clothVertices);
            }

            clothVertices[center].position.z = waveZ;
            // синхронизируем позиции после изменения в constraints
            syncOldPositions(clothVertices);
        }

        // отправляем новые вершины на GPU
        updateVertexBuffer(device, vertexBuffer, grid.COLS, grid.ROWS);
        updateCamera(device, cameraBuffer, canvas, orbit);


        // DRAW
        const encoder = device.createCommandEncoder();

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

        // Передаем команды видеокарте
        device.queue.submit([encoder.finish()]);

        // Следующий кадр
        requestAnimationFrame(render);
    }

    return render;
}