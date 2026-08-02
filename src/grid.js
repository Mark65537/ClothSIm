import Vertex from "./Vertex.js";

/**
 * Функция для конвертации класса Vertex в массив
 *
 * @param {Vertex[]} vertices - массив вершин
 * @returns {Float32Array} массив.
 */
export function vertexToArray(vertices)
{
    const data = new Float32Array(vertices.length * 3);

    for(let i = 0; i < vertices.length; i++)
    {
        const v = vertices[i];

        data[i * 3 + 0] = v.position.x;
        data[i * 3 + 1] = v.position.y;
        data[i * 3 + 2] = v.position.z;
    }

    return data;
}

/**
 * Создает сетку из треуголиников.
 *
 * @param {number} cols - количество столбцов.
 * @param {number} rows - количество строк.
 * @param {number} size - физический размер всей сетки. Не может превышать 2
 * @returns {Object} Объект с данными сетки.
 */
export function generateGrid(cols, rows, size = 1.2) {

    const vertices = [];
    const triangleIndices = [];
    const lineIndices = [];

    // расстояния через которые проходит каждая вершина
    const dx = size / cols;
    const dy = size / rows;

    // вычисляем левый верхний угол
    const startX = -size / 2;
    const startY = size / 2;

    // ---------- вершины ----------
    for (let y = 0; y <= rows; y++) {
        for (let x = 0; x <= cols; x++) {
            vertices.push(new Vertex(startX + x * dx, startY - y * dy, 0));
        }
    }

    const stride = cols + 1; // так как количество квадратов больще чем вершин на 1

    // ---------- индексы ----------
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {


            // расположение от центра квадрата
            const v0 = y * stride + x; // ←↑ высота
            const v1 = v0 + 1; // →↑
            const v2 = v0 + stride; // ←↓
            const v3 = v2 + 1; // →↓

            // два треугольника
            triangleIndices.push(
                v0, v2, v3,
                v0, v1, v3
            );

            // линии квадрата
            lineIndices.push(
                v0, v1,
                v1, v3,
                v3, v2,
                v2, v0,

                // диагональ
                v0, v3
            );
        }
    }

    // Закрепляем углы
    vertices[0].isPinned = true;
    vertices[cols].isPinned = true;
    vertices[rows * stride].isPinned = true;
    vertices[(rows + 1) * stride - 1].isPinned = true;

    // Центральная вершина — кинематическая
    const drivenIndex = Math.floor(rows / 2) * stride + Math.floor(cols / 2);
    vertices[drivenIndex].isDriven = true;

    return {
        vertices,
        triangleIndices: new Uint16Array(triangleIndices),
        lineIndices: new Uint16Array(lineIndices),
        COLS: cols,
        ROWS: rows,
        drivenIndex,
    };
}