let device;
let context;
let pipeline;
let vertexBuffer;

function render() {
    const texture = context.getCurrentTexture();
    const encoder = device.createCommandEncoder();

    // Render Pass
    const pass = encoder.beginRenderPass({
        colorAttachments:
            [
                {
                    view: texture.createView(),
                    clearValue: { r: 0.1, g: 0.2, b: 0.8, a: 1 },
                    loadOp: "clear",
                    storeOp: "store"
                }
            ]
    });

    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.draw(3);
    pass.end();

    // Передаем команды видеокарте
    device.queue.submit([encoder.finish()]);

    // Следующий кадр
    requestAnimationFrame(render);
}

async function main() {
    if (!navigator.gpu) {
        alert("WebGPU не поддерживается");
        return;
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error("Не удалось получить GPU Adapter.");

    device = await adapter.requestDevice();

    const canvas = document.getElementById("canvas");
    const format = navigator.gpu.getPreferredCanvasFormat();

    context = canvas.getContext("webgpu");
    context.configure({
        device,
        format,
    });

    const shaderCode = await fetch("shaders/triangle.wgsl")
        .then(response => response.text());

    const shaderModule = device.createShaderModule({
        code: shaderCode
    });

    const vertices = new Float32Array([
        0.0, 0.6,
        -0.6, -0.6,
        0.6, -0.6
    ]);

    vertexBuffer = device.createBuffer({
        size: vertices.byteLength,
        usage:
            GPUBufferUsage.VERTEX |
            GPUBufferUsage.COPY_DST
    });

    device.queue.writeBuffer(
        vertexBuffer,
        0,
        vertices
    );

    pipeline = device.createRenderPipeline({
        layout: "auto",
        vertex:
        {
            module: shaderModule,
            entryPoint: "vertexMain",

            buffers:
                [
                    {
                        arrayStride: 8,
                        attributes:
                            [
                                {
                                    shaderLocation: 0,
                                    offset: 0,
                                    format: "float32x2"
                                }
                            ]
                    }
                ]
        },

        fragment:
        {
            module: shaderModule,
            entryPoint: "fragmentMain",

            targets: [{ format }]
        },

        primitive:
        {
            topology: "triangle-list"
        }

    });


    render();
}

main();
