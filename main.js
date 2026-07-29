let device;
let context;

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

    // Пока ничего не рисуем
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

    render();
}

main();