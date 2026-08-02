import { distance3D } from "./math.js";

export class Constraint {

    constructor(v1Index, v2Index, distance, batch) {
        this.v1Index = v1Index;
        this.v2Index = v2Index;
        this.distance = distance;
        this.batch = batch;
    }
}

/** Батч для параллельного решения ограничений на GPU (без гонок). */
function constraintBatch(type, x, y) {
    if (type === "h") return x & 1;
    if (type === "v") return 2 + (y & 1);
    return 4 + (x & 1);
}

/** Упаковка ограничений в GPU-буфер: v1, v2, restLength, batch. */
export function constraintsToGPUBuffer(constraints) {
    const data = new ArrayBuffer(constraints.length * 16);
    const view = new DataView(data);

    for (let i = 0; i < constraints.length; i++) {
        const c = constraints[i];
        const offset = i * 16;
        view.setUint32(offset + 0, c.v1Index, true);
        view.setUint32(offset + 4, c.v2Index, true);
        view.setFloat32(offset + 8, c.distance, true);
        view.setUint32(offset + 12, c.batch, true);
    }

    return data;
}

/** Создание неких правил, ограничений */
export function createConstraints(vertices, cols, rows) {
    if (cols <= 0) {
        console.error('Количество столбцов должно быть больше нуля');
    }
    if (rows <= 0) {
        console.error('Количество строк должно быть больше нуля');
    }

    const constraints = [];

    // выравнивание по вершинам
    const stride = cols + 1;

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {

            const curIndex = y * stride + x;

            // строятся связи индексов между соседними вершинами
            // горизонтальная связь
            if (x < cols) {
                constraints.push(new Constraint(
                    curIndex,
                    curIndex + 1,
                    distance3D(vertices[curIndex].position, vertices[curIndex + 1].position),
                    constraintBatch("h", x, y)
                ));
            }
            // Вертикальная связь
            if (y < rows) {
                constraints.push(new Constraint(
                    curIndex,
                    curIndex + stride,
                    distance3D(vertices[curIndex].position, vertices[curIndex + stride].position),
                    constraintBatch("v", x, y)
                ));
            }

            // Диагональные связи
            if (x < cols && y < rows) {
                constraints.push(new Constraint(
                    curIndex,
                    curIndex + stride + 1,
                    distance3D(vertices[curIndex].position, vertices[curIndex + stride + 1].position),
                    constraintBatch("d", x, y)
                ));
            }
        }
    }

    console.log(`Создано связей: ${constraints.length}`); // Выведет в консоль, чтобы убедиться, что они есть!
    return constraints;
}

export function solveConstraints(vertices, constraints) {
    for (const c of constraints) {
        const v1 = vertices[c.v1Index];
        const v2 = vertices[c.v2Index];
        if (v1 === undefined) console.error(`Vertex vertices[${c.a}] не найден`);

        const p1 = v1.position;
        const p2 = v2.position;

        let dx = p2.x - p1.x;
        let dy = p2.y - p1.y;
        let dz = p2.z - p1.z;

        let currentDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (currentDistance === 0) continue; // Защита от деления на 0

        let difference = (currentDistance - c.distance) / currentDistance;

        let offsetX = dx * 0.5 * difference;
        let offsetY = dy * 0.5 * difference;
        let offsetZ = dz * 0.5 * difference;

        // Смотрим, закреплена ли вершина
        const w1 = v1.isPinned ? 0 : 1;
        const w2 = v2.isPinned ? 0 : 1;

        if (w1 === 0 && w2 === 0) continue; // Обе зафиксированы - не двигаем

        const factor1 = w1 / (w1 + w2);
        const factor2 = w2 / (w1 + w2);

        p1.x += offsetX * 2 * factor1;
        p1.y += offsetY * 2 * factor1;
        p1.z += offsetZ * 2 * factor1;

        p2.x -= offsetX * 2 * factor2;
        p2.y -= offsetY * 2 * factor2;
        p2.z -= offsetZ * 2 * factor2;
    }
}