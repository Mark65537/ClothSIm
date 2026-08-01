import { initWebGPU } from "./webGPU.js";
import { generateGrid } from "./grid.js";
import { createRenderer } from "./renderer.js";
import { createOrbitCamera, beginDrag, endDrag, dragOrbit, zoomOrbit } from "./camera.js";

const COLS = 2, ROWS = 2, //количество квадратов, не вершин
SIZE = 1.2;

const canvas = document.getElementById("canvas");

function setupCanvas() {
    // для четкости вывода
    const devicePixelRatio = window.devicePixelRatio;
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
}

function setupEventListeners(orbit) {
    canvas.addEventListener("pointerdown", (e) => {
        beginDrag(orbit, e.clientX, e.clientY);
        canvas.setPointerCapture(e.pointerId);
    });

    canvas.addEventListener("pointerup", () => {
        endDrag(orbit);
    });

    canvas.addEventListener("pointermove", (e) => {
        dragOrbit(orbit, e.clientX, e.clientY);
    });

    canvas.addEventListener("wheel", (e) => {
        e.preventDefault();
        zoomOrbit(orbit, e.deltaY);
    }, { passive: false });
}

async function main() {

    setupCanvas();
    
    const { device, context, format } = await initWebGPU(canvas);

    const grid = generateGrid(COLS, ROWS, SIZE);
    const orbit = createOrbitCamera(grid.vertices);

    const render = await createRenderer(
        device,
        context,
        format,
        grid,
        orbit
    );

    setupEventListeners(orbit);

    render();
}

main().catch(console.error);
