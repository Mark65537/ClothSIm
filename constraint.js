export class Constraint {

    constructor(a, b, distance) {
        this.a = a;
        this.b = b;
        this.distance = distance;
    }

}

// Теперь функция принимает vertices, чтобы измерить реальное начальное расстояние
export function createConstraints(vertices, cols, rows) {
    if (cols <= 0 ) {
        console.error('Количество столбцов должно быть больше нуля');
    }
    if (rows <= 0 ) {
        console.error('Количество строк должно быть больше нуля');
    }

    const constraints = [];

    // Функция для вычисления реальной начальной длины пружины
    const getDist = (i1, i2) => {
        const p1 = vertices[i1].position;
        const p2 = vertices[i2].position;
        return Math.sqrt(
            (p2.x - p1.x) ** 2 +
            (p2.y - p1.y) ** 2 +
            (p2.z - p1.z) ** 2
        );
    };

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const index = y * cols + x;

            if (x < cols - 1) {
                constraints.push(new Constraint(index, index + 1, getDist(index, index + 1)));
            }
            if (y < rows - 1) {
                constraints.push(new Constraint(index, index + cols, getDist(index, index + cols)));
            }
            if (x < cols - 1 && y < rows - 1) {
                constraints.push(new Constraint(index, index + cols + 1, getDist(index, index + cols + 1)));
            }
            if (x > 0 && y < rows - 1) {
                constraints.push(new Constraint(index, index + cols - 1, getDist(index, index + cols - 1)));
            }
        }
    }
    
    console.log(`Создано связей: ${constraints.length}`); // Выведет в консоль, чтобы убедиться, что они есть!
    return constraints;
}

export function solveConstraints(vertices, constraints) {
    for (const c of constraints) {
        const v1 = vertices[c.a];
        const v2 = vertices[c.b];
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