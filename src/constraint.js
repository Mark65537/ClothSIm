import { distance3D } from "./math.js";

export class Constraint {

    constructor(v1Index, v2Index, distance) {
        this.v1Index = v1Index;
        this.v2Index = v2Index;
        this.distance = distance;
    }
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

    // строятся связи индексов между соседними вершинами
    // горизонтальная связь
    for (let y = 0; y <= rows; y++) {
        for (let x = 0; x < cols; x++) {

            const curIndex = y * stride + x;
            constraints.push(new Constraint(
                curIndex,
                curIndex + 1,
                distance3D(vertices[curIndex].position, vertices[curIndex + 1].position)
            ));
        }
    }

    // Вертикальная связь
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x <= cols; x++) {
            const curIndex = y * stride + x;
            constraints.push(new Constraint(
                curIndex,
                curIndex + stride,
                distance3D(vertices[curIndex].position, vertices[curIndex + stride].position)
            ));
        }
    }

    // Диагональные связи (обе — иначе квадраты могут складываться)
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const curIndex = y * stride + x;
            constraints.push(new Constraint(
                curIndex,
                curIndex + stride + 1,
                distance3D(vertices[curIndex].position, vertices[curIndex + stride + 1].position)
            ));
            constraints.push(new Constraint(
                curIndex + 1,
                curIndex + stride,
                distance3D(vertices[curIndex + 1].position, vertices[curIndex + stride].position)
            ));
        }
    }

    // Изгиб — связи через одну вершину, стабилизируют края
    for (let y = 0; y <= rows; y++) {
        for (let x = 0; x <= cols; x++) {
            const curIndex = y * stride + x;

            if (x + 2 <= cols) {
                constraints.push(new Constraint(
                    curIndex,
                    curIndex + 2,
                    distance3D(vertices[curIndex].position, vertices[curIndex + 2].position)
                ));
            }
            if (y + 2 <= rows) {
                constraints.push(new Constraint(
                    curIndex,
                    curIndex + stride * 2,
                    distance3D(vertices[curIndex].position, vertices[curIndex + stride * 2].position)
                ));
            }
        }
    }

    console.log(`Создано связей: ${constraints.length}`); // Выведет в консоль, чтобы убедиться, что они есть!
    return constraints;
}

function isFixed(v) {
    return v.isPinned || v.isDriven;
}

export function restorePinnedVertices(vertices) {
    for (const v of vertices) {
        if (v.isPinned) {
            v.position.x = v.restPosition.x;
            v.position.y = v.restPosition.y;
            v.position.z = v.restPosition.z;
            v.velocity.x = 0;
            v.velocity.y = 0;
            v.velocity.z = 0;
        }
    }
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

        const w1 = isFixed(v1) ? 0 : 1;
        const w2 = isFixed(v2) ? 0 : 1;

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