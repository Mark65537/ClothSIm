import { initWebGPU } from "./webGPU.js";
import { generateGrid } from "./grid.js";
import { createRenderer } from "./renderer.js";
import { createOrbitCamera, beginDrag, endDrag, dragOrbit } from "./camera.js";

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
    canvas.addEventListener("mousedown", (e) => {
        if (e.button !== 0) return;
        beginDrag(orbit, e.clientX, e.clientY);
    });

    window.addEventListener("mouseup", () => {
        endDrag(orbit);
    });

    window.addEventListener("mousemove", (e) => {
        dragOrbit(orbit, e.clientX, e.clientY);
    });
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
