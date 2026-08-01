import * as mat4 from './mat4.js';

const projection = mat4.create();
const view = mat4.create();
const viewProjection = mat4.create();

const SENSITIVITY = 0.005;
const MIN_PITCH = -Math.PI / 2 + 0.05;
const MAX_PITCH = Math.PI / 2 - 0.05;

function computeBounds(vertices) {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const v of vertices) {
        minX = Math.min(minX, v.position.x);
        maxX = Math.max(maxX, v.position.x);
        minY = Math.min(minY, v.position.y);
        maxY = Math.max(maxY, v.position.y);
    }

    return {
        minX, maxX, minY, maxY,
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2,
        size: Math.max(maxX - minX, maxY - minY),
    };
}

export function createOrbitCamera(vertices) {
    const { minX, maxY, centerX, centerY, size } = computeBounds(vertices);
    const height = size * 2;
    const dx = minX - centerX;
    const dy = maxY - centerY;
    const dz = height;
    const distance = Math.hypot(dx, dy, dz);

    return {
        yaw: Math.atan2(dx, dy),
        pitch: Math.asin(dz / distance),
        distance,
        dragging: false,
        lastX: 0,
        lastY: 0,
    };
}

export function updateCamera(device, cameraBuffer, canvas, vertices, orbit) {
    const { centerX, centerY } = computeBounds(vertices);
    const target = [centerX, centerY, 0];

    const horizontal = orbit.distance * Math.cos(orbit.pitch);
    const eye = [
        target[0] + horizontal * Math.sin(orbit.yaw),
        target[1] + horizontal * Math.cos(orbit.yaw),
        target[2] + orbit.distance * Math.sin(orbit.pitch),
    ];

    const aspect = canvas.width / canvas.height;

    mat4.perspectiveZO(projection, Math.PI / 4, aspect, 0.1, 100);
    mat4.lookAt(view, eye, target, [0, 1, 0]);
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
    orbit.pitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, orbit.pitch - dy * SENSITIVITY));
}
