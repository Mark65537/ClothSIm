/** Класс вершины(точки) */
export default class Vertex {
    constructor(x, y, z = 0, color = { r: 1, g: 1, b: 1 }) {
        this.position = { x, y, z };
        this.oldPosition = { x, y, z };
        this.restPosition = { x, y, z };
        this.color = color;
        this.isPinned = false;
        this.isDriven = false;
    }
}