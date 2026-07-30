import Vertex from "./Vertex.js";

export function createVertexArray(vertices)
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

export function generateGrid(cols, rows, size = 1.2) {

    const vertices = [];
    const triangleIndices = [];
    const lineIndices = [];

    const dx = size / cols;
    const dy = size / rows;

    const startX = -size / 2;
    const startY = size / 2;

    // ---------- вершины ----------
    for (let y = 0; y <= rows; y++) {
        for (let x = 0; x <= cols; x++) {
            vertices.push(new Vertex(startX + x * dx, startY - y * dy, 0));
        }
    }

    const stride = cols + 1;

    // ---------- индексы ----------
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {

            const v0 = y * stride + x;
            const v1 = v0 + 1;
            const v2 = v0 + stride;
            const v3 = v2 + 1;

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
    vertices[0].fixed = true;
    vertices[cols].fixed = true;
    vertices[rows * (cols + 1)].fixed = true;
    vertices[(rows + 1) * (cols + 1) - 1].fixed = true;

    return {
        vertices,
        triangleIndices: new Uint16Array(triangleIndices),
        lineIndices: new Uint16Array(lineIndices),
        COLS: cols, 
        ROWS: rows
    };
}