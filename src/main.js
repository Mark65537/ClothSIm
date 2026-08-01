import { initWebGPU } from "./webGPU.js";
import { generateGrid } from "./grid.js";
import { createRenderer } from "./renderer.js";
import { createOrbitCamera, beginDrag, endDrag, dragOrbit, zoomOrbit } from "./camera.js";

const COLS = 10, ROWS = 10, //количество квадратов, не вершин
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

function setupUI(numVerts, numConstraints) {
    const panel = document.getElementById("panel");
    const toggle = document.getElementById("panel-toggle");
    const statsEl = document.getElementById("stats");

    const initial = {
        gravity: document.getElementById("gravity").checked,
        wire: document.getElementById("wire").checked,
    };

    const sliders = [
        { id: "amp", valId: "amp-val", fmt: (v) => v.toFixed(2) },
        { id: "freq", valId: "freq-val", fmt: (v) => v.toFixed(2) },
        { id: "grav", valId: "grav-val", fmt: (v) => v.toFixed(1) },
        { id: "sub", valId: "sub-val", fmt: (v) => String(Math.round(v)) },
    ];

    const updateSlider = ({ id, valId, fmt }) => {
        const el = document.getElementById(id);
        const out = document.getElementById(valId);
        const v = parseFloat(el.value);
        out.textContent = fmt(id === "sub" ? Math.round(v) : v);
    };

    for (const slider of sliders) {
        const el = document.getElementById(slider.id);
        el.addEventListener("input", () => updateSlider(slider));
        updateSlider(slider);
    }

    function resetControls() {
        document.getElementById("gravity").checked = initial.gravity;
        document.getElementById("wire").checked = initial.wire;

        for (const slider of sliders) {
            const el = document.getElementById(slider.id);
            el.value = el.defaultValue;
            updateSlider(slider);
        }
    }

    toggle.addEventListener("click", () => {
        const collapsed = panel.classList.toggle("collapsed");
        toggle.textContent = collapsed ? "+" : "−";
        toggle.title = collapsed ? "Развернуть" : "Свернуть";
        toggle.setAttribute("aria-label", collapsed ? "Развернуть панель" : "Свернуть панель");
    });

    document.getElementById("reset").addEventListener("click", () => {
        resetControls();
    });

    statsEl.textContent = `${numVerts} вершин · ${numConstraints} констрейнтов`;
}

async function main() {

    setupCanvas();
    
    const { device, context, format } = await initWebGPU(canvas);

    const grid = generateGrid(COLS, ROWS, SIZE);
    const orbit = createOrbitCamera();

    const render = await createRenderer(
        device,
        context,
        format,
        grid,
        orbit
    );

    setupEventListeners(orbit);
    setupUI(grid.vertices.length, undefined);

    render();
}

main().catch(console.error);
