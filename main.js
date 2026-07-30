import { initWebGPU } from "./webGPU.js";
import { generateGrid } from "./grid.js";
import { createRenderer } from "./renderer.js";

const COLS = 10, ROWS = 10, SIZE = 1.2;

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
