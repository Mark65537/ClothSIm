/** Класс вершины(точки) */
export default class Vertex {
    constructor(x, y, z = 0) {
        this.position = { x, y, z };
        this.oldPosition = { x, y, z };
        this.restPosition = { x, y, z };
        this.velocity = { x: 0, y: 0, z: 0 };
        this.isPinned = false;
        this.isDriven = false;
    }
}