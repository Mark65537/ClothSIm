export default class Vertex {
    constructor(x, y, z = 0) {
        this.position =
        {
            x,
            y,
            z
        };

        this.previous =
        {
            x,
            y,
            z
        };

        this.fixed = false;
    }
}