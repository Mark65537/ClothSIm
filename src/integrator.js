/**
 * Численный интегратор Верле (Verlet integration).
 *
 * Обновляет позиции свободных вершин по их скорости.
 * Скорость выводится из разницы position − oldPosition —
 * отдельный массив скоростей не нужен.
 *
 * После интеграции ограничения (constraints) корректируют позиции,
 * сохраняя форму ткани.
 */

const NO_FORCE = { x: 0, y: 0, z: 0 };
const DEFAULT_DAMPING = 0.995;

/**
 * Один шаг интегрирования для всех свободных вершин.
 *
 * @param {import("./Vertex.js").default[]} vertices
 * @param {number} dt — шаг времени в секундах
 * @param {{ x: number, y: number, z: number }} [acceleration] — внешнее ускорение (гравитация, ветер и т.д.)
 * @param {number} [damping] — затухание скорости (0..1)
 */
export function integrate(vertices, dt, acceleration = NO_FORCE, damping = DEFAULT_DAMPING) {
    const dtSq = dt * dt;

    for (const v of vertices) {
        if (v.isPinned || v.isDriven) continue;

        const px = v.position.x;
        const py = v.position.y;
        const pz = v.position.z;

        const vx = (px - v.oldPosition.x) * damping;
        const vy = (py - v.oldPosition.y) * damping;
        const vz = (pz - v.oldPosition.z) * damping;

        v.oldPosition.x = px;
        v.oldPosition.y = py;
        v.oldPosition.z = pz;

        v.position.x = px + vx + acceleration.x * dtSq;
        v.position.y = py + vy + acceleration.y * dtSq;
        v.position.z = pz + vz + acceleration.z * dtSq;
    }
}
