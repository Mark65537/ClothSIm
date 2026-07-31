import { initWebGPU } from "./webGPU.js";
import { generateGrid } from "./grid.js";
import { createRenderer } from "./renderer.js";

const COLS = 2, ROWS = 2, //количество квадратов, не вершин
SIZE = 1.2;

async function main() {

    const { device, context, format } = await initWebGPU();

    const grid = generateGrid(COLS, ROWS, SIZE);

    const render = await createRenderer(
        device,
        context,
        format,
        grid
    );

    render();
}

main().catch(console.error);
