let device, context, fillPipeline, linePipeline, vertexBuffer, triangleIndexBuffer, lineIndexBuffer;
let triangleIndexCount;
let lineIndexCount;
const COLS = 10, ROWS = 10, SIZE = 1.2;

function render() {
    const texture = context.getCurrentTexture();
    const encoder = device.createCommandEncoder();

    // Render Pass
    const renderPass = encoder.beginRenderPass({
        colorAttachments: [{
            view: texture.createView(),
            clearValue: { r: 0.1, g: 0.2, b: 0.8, a: 1 },
            loadOp: "clear",
            storeOp: "store"
        }]
    });

    renderPass.setPipeline(fillPipeline);
    renderPass.setVertexBuffer(0, vertexBuffer);
    renderPass.setIndexBuffer(triangleIndexBuffer, "uint16");
    renderPass.drawIndexed(triangleIndexCount);

    renderPass.setPipeline(linePipeline);
    renderPass.setIndexBuffer(lineIndexBuffer, "uint16");
    renderPass.drawIndexed(lineIndexCount);

    renderPass.end();

    // Передаем команды видеокарте
    device.queue.submit([encoder.finish()]);

    // Следующий кадр
    requestAnimationFrame(render);
}

/** Инициализация WebGPU*/
async function initWebGPU() {
    if (!navigator.gpu) {
        alert("WebGPU не поддерживается");
        return;
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error("Не удалось получить GPU Adapter.");

    device = await adapter.requestDevice();
    device.lost.then(() => { throw new Error("Не удалось получить GPU Device.") });

    const canvas = document.getElementById("canvas");
    // для четкости вывода
    const devicePixelRatio = window.devicePixelRatio;
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;

    context = canvas.getContext("webgpu");
    if (!context) throw new Error("WebGPU context не создан");
    context.configure({
        device,
        format: navigator.gpu.getPreferredCanvasFormat(),
    });
}

function generateGrid(cols, rows, size = 1.2) {

    const vertices = [];
    const triangleIndices = [];
    const lineIndices = [];

    const dx = size / cols;
    const dy = size / rows;

    const startX = -size / 2;
    const startY = size / 2;

    // ---------- вершины ----------
    for (let y = 0; y <= rows; y++) {
        for (let x = 0; x <= cols; x++) {

            vertices.push(
                startX + x * dx,
                startY - y * dy,
                0
            );

        }
    }

    const stride = cols + 1;

    // ---------- индексы ----------
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {

            const v0 = y * stride + x;
            const v1 = v0 + 1;
            const v2 = v0 + stride;
            const v3 = v2 + 1;

            // два треугольника
            triangleIndices.push(
                v0, v2, v3,
                v0, v1, v3
            );

            // линии квадрата
            lineIndices.push(
                v0, v1,
                v1, v3,
                v3, v2,
                v2, v0,

                // диагональ
                v0, v3
            );
        }
    }

    return {
        vertices: new Float32Array(vertices),
        triangleIndices: new Uint16Array(triangleIndices),
        lineIndices: new Uint16Array(lineIndices)
    };
}

async function main() {
    await initWebGPU()

    // TRIANGLE----------------------------
    const TriangleShaderCode = await fetch("shaders/triangle.wgsl")
        .then(response => response.text());

    const TriangleShaderModule = device.createShaderModule({
        code: TriangleShaderCode
    });

    const grid = generateGrid(COLS, ROWS, SIZE);

    const vertices = grid.vertices;
    const squareIndices = grid.triangleIndices;

    triangleIndexCount = squareIndices.length;

    vertexBuffer = device.createBuffer({
        size: vertices.byteLength,
        usage:
            GPUBufferUsage.VERTEX |
            GPUBufferUsage.COPY_DST
    });

    triangleIndexBuffer = device.createBuffer({

        size: squareIndices.byteLength,

        usage:
            GPUBufferUsage.INDEX |
            GPUBufferUsage.COPY_DST

    });

    device.queue.writeBuffer(
        vertexBuffer,
        0,
        vertices
    );

    device.queue.writeBuffer(
        triangleIndexBuffer,
        0,
        squareIndices
    );

    const format = navigator.gpu.getPreferredCanvasFormat();

    fillPipeline = device.createRenderPipeline({
        layout: "auto",
        vertex: {
            module: TriangleShaderModule,
            entryPoint: "vertexMain",
            buffers: [{
                arrayStride: 12,
                attributes:
                    [{
                        shaderLocation: 0,
                        offset: 0,
                        format: "float32x3"
                    }]
            }]
        },

        fragment: {
            module: TriangleShaderModule,
            entryPoint: "fragmentMain",
            targets: [{ format }]
        },

        primitive: {
            topology: "triangle-list"
        }

    });


    // LINES--------------------------

    const lineShaderCode = await fetch("shaders/line.wgsl")
        .then(response => response.text());

    const lineShaderModule = device.createShaderModule({
        code: lineShaderCode
    });

    const lineIndices = grid.lineIndices;

    lineIndexCount = lineIndices.length;

    lineIndexBuffer = device.createBuffer({
        size: lineIndices.byteLength,
        usage:
            GPUBufferUsage.INDEX |
            GPUBufferUsage.COPY_DST
    });

    device.queue.writeBuffer(
        lineIndexBuffer,
        0,
        lineIndices
    );

    linePipeline = device.createRenderPipeline({
        layout: "auto",
        vertex: {
            module: lineShaderModule,
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
            module: lineShaderModule,
            entryPoint: "lineFragment",
            targets: [{
                format
            }]
        },

        primitive: {
            topology: "line-list"
        }

    });

    render();
}

main().catch(console.error);
