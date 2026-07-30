import { createVertexArray } from './grid.js';

let clothVertices = [];

async function loadShader(device, path) {
    const code = await fetch(path).then(r => r.text());
    return device.createShaderModule({ code });
}

function updateVertexBuffer(device, vertexBuffer) {
    const gpuVertices = createVertexArray(clothVertices);
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

    clothVertices = grid.vertices;
    const gpuVertices = createVertexArray(clothVertices);

    const vertexBuffer = createVertexBuffer(device, gpuVertices);

    const triangleIndexBuffer = createIndexBuffer(device, grid.triangleIndices);
    const lineIndexBuffer = createIndexBuffer(device, grid.lineIndices);

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

    //TODO : вынести в отдельную функцию
    function render() {

        // изменение данных ткани
        clothVertices[60].position.y += 0.1;

        // отправляем новые вершины на GPU
        updateVertexBuffer(device, vertexBuffer);

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

        renderPass.setPipeline(fillPipeline);
        renderPass.setIndexBuffer(triangleIndexBuffer, "uint16");
        renderPass.drawIndexed(grid.triangleIndices.length);

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