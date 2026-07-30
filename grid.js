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

            vertices.push(
                startX + x * dx,
                startY - y * dy,
                0
            );

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

    return {
        vertices: new Float32Array(vertices),
        triangleIndices: new Uint16Array(triangleIndices),
        lineIndices: new Uint16Array(lineIndices)
    };
}