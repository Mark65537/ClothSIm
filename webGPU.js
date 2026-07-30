/** Инициализация WebGPU*/
export async function initWebGPU(canvasId = "canvas") {
    if (!navigator.gpu) {
        alert("WebGPU не поддерживается");
        return;
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error("Не удалось получить GPU Adapter.");

    const device = await adapter.requestDevice();
    device.lost.then(() => { throw new Error("Не удалось получить GPU Device.") });

    const canvas = document.getElementById(canvasId);
    // для четкости вывода
    const devicePixelRatio = window.devicePixelRatio;
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;

    const context = canvas.getContext("webgpu");
    if (!context) throw new Error("WebGPU context не создан");
    context.configure({
        device,
        format: navigator.gpu.getPreferredCanvasFormat(),
    });

    return {
        device,
        context,
        format: navigator.gpu.getPreferredCanvasFormat()
    };
}