import { initWebGPU } from "./webGPU.js";
import { generateGrid } from "./grid.js";
import { createRenderer } from "./renderer.js";
import { createOrbitCamera, beginDrag, endDrag, dragOrbit, zoomOrbit } from "./camera.js";

const COLS = 10, ROWS = 10, //количество квадратов, не вершин
SIZE = 1.2;

const DEFAULT_SETTINGS = {
    hasGravity: false,
    hasWire: true,
    amplitude: 0.18,
    frequency: 0.80,
    gravity: 10.0,
    substeps: 10,
};

let appSettings = { ...DEFAULT_SETTINGS };

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

    // Кнопка сворачивания панели
    const toggle = document.getElementById("panel-toggle");
    toggle.addEventListener("click", () => {
        const collapsed = panel.classList.toggle("collapsed");
        toggle.textContent = collapsed ? "+" : "−";
        toggle.title = collapsed ? "Развернуть" : "Свернуть";
        toggle.setAttribute("aria-label", collapsed ? "Развернуть панель" : "Свернуть панель");
    });

    // СЛАЙДЕРЫ
    const amp = document.getElementById("amp");
    const freq = document.getElementById("freq");
    const grav = document.getElementById("grav");
    const sub = document.getElementById("sub");

    amp.addEventListener("input", () => {
        appSettings.amplitude = Number(amp.value);
        document.getElementById("amp-val").textContent = appSettings.amplitude.toFixed(2);
    });
    freq.addEventListener("input", () => {
        appSettings.frequency = Number(freq.value);
        document.getElementById("freq-val").textContent = appSettings.frequency.toFixed(2);
    });

    grav.addEventListener("input", () => {
        appSettings.gravity = Number(grav.value);
        document.getElementById("grav-val").textContent = appSettings.gravity.toFixed(1);
    });

    sub.addEventListener("input", () => {
        appSettings.substeps = Math.round(Number(sub.value));
        document.getElementById("sub-val").textContent = appSettings.substeps.toString();
    });

    // ЧЕКБОКСЫ
    const gravity = document.getElementById("gravity");
    const wire = document.getElementById("wire");

    gravity.addEventListener("change", () => {
        appSettings.hasGravity = gravity.checked;
    });
    wire.addEventListener("change", () => {
        appSettings.hasWire = wire.checked;
    });

    // КНОПКА СБРОСА
    document.getElementById("reset").addEventListener("click", () => {
        setDefaultUiValues();
    });
}

function setDefaultUiValues() {
    Object.assign(appSettings, DEFAULT_SETTINGS);

    // VALUE
    document.getElementById("gravity").checked = DEFAULT_SETTINGS.hasGravity;
    document.getElementById("wire").checked = DEFAULT_SETTINGS.hasWire;
    document.getElementById("amp").value = DEFAULT_SETTINGS.amplitude;
    document.getElementById("freq").value = DEFAULT_SETTINGS.frequency;
    document.getElementById("grav").value = DEFAULT_SETTINGS.gravity;
    document.getElementById("sub").value = DEFAULT_SETTINGS.substeps;

    // VIEW
    document.getElementById("amp-val").textContent = DEFAULT_SETTINGS.amplitude.toFixed(2);
    document.getElementById("freq-val").textContent = DEFAULT_SETTINGS.frequency.toFixed(2);
    document.getElementById("grav-val").textContent = DEFAULT_SETTINGS.gravity.toFixed(1);
    document.getElementById("sub-val").textContent = DEFAULT_SETTINGS.substeps.toString();
}

function setupUI(numVerts, numConstraints) {
    
    setDefaultUiValues();
    
    const statsEl = document.getElementById("stats");
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
        orbit,
        appSettings
    );

    setupEventListeners(orbit);
    setupUI(grid.vertices.length, undefined);

    render();
}

main().catch(console.error);
