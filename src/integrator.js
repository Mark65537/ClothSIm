/**
 * Semi-implicit Euler + явная скорость
 *
 * Гравитация накапливается в velocity каждый подшаг и не теряется
 * после syncVelocities — иначе Verlet + syncOldPositions обнуляет
 * импульс и сила по Z на плоскости XY почти не видна.
 */

const NO_FORCE = { x: 0, y: 0, z: 0 };
const DEFAULT_DAMPING = 0.995;

/**
 * @param {import("./Vertex.js").default[]} vertices
 * @param {number} dt
 * @param {{ x: number, y: number, z: number }} [acceleration]
 * @param {number} [damping]
 */
export function integrate(vertices, dt, acceleration = NO_FORCE, damping = DEFAULT_DAMPING) {
    for (const v of vertices) {
        if (v.isPinned || v.isDriven) continue;

        v.velocity.x += acceleration.x * dt;
        v.velocity.y += acceleration.y * dt;
        v.velocity.z += acceleration.z * dt;

        v.velocity.x *= damping;
        v.velocity.y *= damping;
        v.velocity.z *= damping;

        v.oldPosition.x = v.position.x;
        v.oldPosition.y = v.position.y;
        v.oldPosition.z = v.position.z;

        v.position.x += v.velocity.x * dt;
        v.position.y += v.velocity.y * dt;
        v.position.z += v.velocity.z * dt;
    }
}

/**
 * Пересчитывает velocity из фактического смещения после constraints.
 *
 * @param {import("./Vertex.js").default[]} vertices
 * @param {number} dt
 */
export function syncVelocities(vertices, dt) {
    const invDt = 1 / dt;

    for (const v of vertices) {
        if (v.isPinned || v.isDriven) {
            v.velocity.x = 0;
            v.velocity.y = 0;
            v.velocity.z = 0;
        } else {
            v.velocity.x = (v.position.x - v.oldPosition.x) * invDt;
            v.velocity.y = (v.position.y - v.oldPosition.y) * invDt;
            v.velocity.z = (v.position.z - v.oldPosition.z) * invDt;
        }

        v.oldPosition.x = v.position.x;
        v.oldPosition.y = v.position.y;
        v.oldPosition.z = v.position.z;
    }
}
