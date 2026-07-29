let device, context, pipeline, vertexBuffer;

function render() {
    const texture = context.getCurrentTexture();
    const encoder = device.createCommandEncoder();

    // Render Pass
    const pass = encoder.beginRenderPass({
        colorAttachments: [{
            view: texture.createView(),
            clearValue: { r: 0.1, g: 0.2, b: 0.8, a: 1 },
            loadOp: "clear",
            storeOp: "store"
        }]
    });

    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.setIndexBuffer(indexBuffer, "uint16");
    pass.drawIndexed(6);
    pass.end();

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

    const shaderCode = await fetch("shaders/triangle.wgsl")
        .then(response => response.text());

    const shaderModule = device.createShaderModule({
        code: shaderCode
    });

    const vertices = new Float32Array([
        -0.6, 0.6, 0,// ←↑
        0.6, 0.6, 0,// →↑
        -0.6, -0.6, 0,//←↓        
        0.6, -0.6, 0,//→↓
    ]);

    const indices = new Uint16Array([
        0, 2, 3,
        0, 1, 3,
    ]);

    vertexBuffer = device.createBuffer({
        size: vertices.byteLength,
        usage:
            GPUBufferUsage.VERTEX |
            GPUBufferUsage.COPY_DST
    });

    indexBuffer = device.createBuffer({

        size: indices.byteLength,

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
        indexBuffer,
        0,
        indices
    );

    const format = navigator.gpu.getPreferredCanvasFormat();

    pipeline = device.createRenderPipeline({
        layout: "auto",
        vertex: {
            module: shaderModule,
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
            module: shaderModule,
            entryPoint: "fragmentMain",
            targets: [{ format }]
        },

        primitive: {
            topology: "triangle-list"
        }

    });


    render();
}

main().catch(console.error);
