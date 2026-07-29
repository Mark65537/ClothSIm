let device, context, fillPipeline, linePipeline, vertexBuffer, triangleIndexBuffer, lineIndexBuffer;

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
    renderPass.drawIndexed(6);

    renderPass.setPipeline(linePipeline);
    renderPass.setIndexBuffer(lineIndexBuffer, "uint16");
    renderPass.drawIndexed(10);

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

async function main() {
    await initWebGPU()

    // TRIANGLE----------------------------
    const TriangleShaderCode = await fetch("shaders/triangle.wgsl")
        .then(response => response.text());

    const TriangleShaderModule = device.createShaderModule({
        code: TriangleShaderCode
    });

    const vertices = new Float32Array([
        -0.6, 0.6, 0,// ←↑
        0.6, 0.6, 0,// →↑
        -0.6, -0.6, 0,//←↓        
        0.6, -0.6, 0,//→↓
    ]);

    const squareIndices = new Uint16Array([
        0, 2, 3,
        0, 1, 3,
    ]);

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

    const lineIndices = new Uint16Array([
        0, 1, // верх
        1, 3, // право
        3, 2, // низ
        2, 0,  // лево
        0, 3, // диагональ
    ]);

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
