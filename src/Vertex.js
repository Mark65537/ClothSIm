/** Класс вершины(точки) */
export default class Vertex {
    constructor(x, y, z = 0) {
        this.position = { x, y, z };
        this.oldPosition = { x, y, z };
        this.restPosition = { x, y, z };
        this.isPinned = false;
        this.isDriven = false;
    }
}