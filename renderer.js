import { vertexToArray } from './grid.js';
import { createConstraints, solveConstraints } from './constraint.js';
import * as mat4 from './mat4.js';

const projection = mat4.create();
const view = mat4.create();
const viewProjection = mat4.create();

let clothVertices = [];

async function loadShader(device, path) {
    const code = await fetch(path).then(r => r.text());
    return device.createShaderModule({ code });
}

function updateVertexBuffer(device, vertexBuffer) {
    const gpuVertices = vertexToArray(clothVertices);
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

function updateCamera(device, cameraBuffer, canvas, vertices) {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const v of vertices) {
        minX = Math.min(minX, v.position.x);
        maxX = Math.max(maxX, v.position.x);
        minY = Math.min(minY, v.position.y);
        maxY = Math.max(maxY, v.position.y);
    }

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const height = Math.max(maxX - minX, maxY - minY) * 2;

    const aspect = canvas.width / canvas.height;

    mat4.perspectiveZO(projection, Math.PI / 4, aspect, 0.1, 100);
    mat4.lookAt(view,
        [minX, maxY, height],
        [centerX, centerY, 0],
        [0, 1, 0]
    );
    mat4.multiply(viewProjection, projection, view);
    device.queue.writeBuffer(cameraBuffer, 0, viewProjection);
}

async function createPipeline(device, format, shaderFile, topology, fragmentEntry) {

    const shader = await loadShader(device, shaderFile);

    return device.createRenderPipeline({

        layout: "auto",

        vertex: {
            module: shader,
            entryPoint: "vertexMain",
            buffers: [{
                arrayStride: 12,
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

export async function createRenderer(device, context, format, grid) {

    clothVertices = grid.vertices;// Все вершины в типе Vertex
    const gpuVertices = vertexToArray(clothVertices);
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
        "fragmentMain"
    );

    const linePipeline = await createPipeline(
        device,
        format,
        "shaders/line.wgsl",
        "line-list",
        "lineFragment"
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

    // высчитываем центральную вершину
    const center = Math.floor(clothVertices.length / 2);

    //TODO : вынести в отдельную функцию
    function render() {

        // update
        const time = performance.now() * 0.001;


        // изменение данных ткани
        clothVertices[center].position.z = Math.sin(time) * 0.2;

        // учитываются все вершины а не одна
        for (let i = 0; i < 5; i++) {
            solveConstraints(clothVertices, constraints);
        }

        // отправляем новые вершины на GPU
        updateVertexBuffer(device, vertexBuffer);
        updateCamera(device, cameraBuffer, canvas, clothVertices);

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

        renderPass.setBindGroup(0, lineCameraBindGroup);
        renderPass.setPipeline(linePipeline);
        renderPass.setIndexBuffer(lineIndexBuffer, "uint16");
        renderPass.drawIndexed(grid.lineIndices.length);

        renderPass.end();

        // Передаем команды видеокарте
        device.queue.submit([encoder.finish()]);

        // Следующий кадр
        requestAnimationFrame(render);
    }

    return render;
}