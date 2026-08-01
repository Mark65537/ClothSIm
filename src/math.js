/** расстояние между двух точек в 3D пространстве 
 * @param {Object} a - первая точка
 * @param {Object} b - вторая точка
 * @returns {number} расстояние между двух точек
*/
export function distance3D(a, b) {
    return Math.hypot(
        a.x - b.x,
        a.y - b.y,
        a.z - b.z
    );
}