import * as mat4 from './mat4.js';

const projection = mat4.create();
const view = mat4.create();
const viewProjection = mat4.create();

const SENSITIVITY = 0.006;
const MIN_PITCH = -1.45;
const MAX_PITCH = 1.45;

export function createOrbitCamera() {
    return {
        yaw: 0.6,
        pitch: 0.65,
        distance: 3.4,
        dragging: false,
        lastX: 0,
        lastY: 0,
    };
}

export function updateCamera(device, cameraBuffer, canvas, orbit) {
    const cp = Math.cos(orbit.pitch);
    const sp = Math.sin(orbit.pitch);
    const eye = [
        orbit.distance * cp * Math.sin(orbit.yaw),
        orbit.distance * sp,
        orbit.distance * cp * Math.cos(orbit.yaw),
    ];

    mat4.lookAt(view, eye, [0, 0, 0], [0, 1, 0]);
    mat4.perspectiveZO(projection, (50 * Math.PI) / 180, canvas.width / canvas.height, 0.05, 50);
    mat4.multiply(viewProjection, projection, view);
    device.queue.writeBuffer(cameraBuffer, 0, viewProjection);
}

export function beginDrag(orbit, x, y) {
    orbit.dragging = true;
    orbit.lastX = x;
    orbit.lastY = y;
}

export function endDrag(orbit) {
    orbit.dragging = false;
}

export function dragOrbit(orbit, x, y) {
    if (!orbit.dragging) return;

    const dx = x - orbit.lastX;
    const dy = y - orbit.lastY;
    orbit.lastX = x;
    orbit.lastY = y;

    orbit.yaw -= dx * SENSITIVITY;
    orbit.pitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, orbit.pitch + dy * SENSITIVITY));
}

export function zoomOrbit(orbit, deltaY) {
    orbit.distance = Math.max(1.2, Math.min(12, orbit.distance * (1 + Math.sign(deltaY) * 0.08)));
}
