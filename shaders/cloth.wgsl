struct SimParams {
    dt: f32,
    accelX: f32,
    accelY: f32,
    accelZ: f32,
    damping: f32,
    centerIndex: u32,
    waveZ: f32,
    vertexCount: u32,
    constraintCount: u32,
    batch: u32,
};

struct VertexData {
    position: vec3f,
    pinned: f32,
    oldPosition: vec3f,
    _pad: f32,
};

struct Constraint {
    v1: u32,
    v2: u32,
    restLength: f32,
    batch: u32,
};

@group(0) @binding(0) var<uniform> params: SimParams;
@group(0) @binding(1) var<storage, read_write> vertices: array<VertexData>;
@group(0) @binding(2) var<storage, read> constraints: array<Constraint>;

@compute @workgroup_size(64)
fn integrate(@builtin(global_invocation_id) gid: vec3u) {
    let i = gid.x;
    if (i >= params.vertexCount) {
        return;
    }

    var v = vertices[i];
    if (v.pinned > 0.5) {
        return;
    }

    let px = v.position.x;
    let py = v.position.y;
    let pz = v.position.z;

    let vx = (px - v.oldPosition.x) * params.damping;
    let vy = (py - v.oldPosition.y) * params.damping;
    let vz = (pz - v.oldPosition.z) * params.damping;

    v.oldPosition = vec3f(px, py, pz);
    v.position = vec3f(
        px + vx + params.accelX * params.dt * params.dt,
        py + vy + params.accelY * params.dt * params.dt,
        pz + vz + params.accelZ * params.dt * params.dt,
    );
    vertices[i] = v;
}

@compute @workgroup_size(1)
fn pinWave(@builtin(global_invocation_id) gid: vec3u) {
    if (gid.x > 0u) {
        return;
    }

    let i = params.centerIndex;
    var v = vertices[i];
    v.position.z = params.waveZ;
    vertices[i] = v;
}

@compute @workgroup_size(64)
fn solveConstraints(@builtin(global_invocation_id) gid: vec3u) {
    let i = gid.x;
    if (i >= params.constraintCount) {
        return;
    }

    let c = constraints[i];
    if (c.batch != params.batch) {
        return;
    }

    var v1 = vertices[c.v1];
    var v2 = vertices[c.v2];

    let p1 = v1.position;
    let p2 = v2.position;

    var dx = p2.x - p1.x;
    var dy = p2.y - p1.y;
    var dz = p2.z - p1.z;

    let currentDistance = sqrt(dx * dx + dy * dy + dz * dz);
    if (currentDistance == 0.0) {
        return;
    }

    let difference = (currentDistance - c.restLength) / currentDistance;

    let offsetX = dx * 0.5 * difference;
    let offsetY = dy * 0.5 * difference;
    let offsetZ = dz * 0.5 * difference;

    let w1 = select(1.0, 0.0, v1.pinned > 0.5);
    let w2 = select(1.0, 0.0, v2.pinned > 0.5);
    if (w1 + w2 == 0.0) {
        return;
    }

    let factor1 = w1 / (w1 + w2);
    let factor2 = w2 / (w1 + w2);

    v1.position += vec3f(offsetX, offsetY, offsetZ) * 2.0 * factor1;
    v2.position -= vec3f(offsetX, offsetY, offsetZ) * 2.0 * factor2;

    vertices[c.v1] = v1;
    vertices[c.v2] = v2;
}

@compute @workgroup_size(64)
fn syncOld(@builtin(global_invocation_id) gid: vec3u) {
    let i = gid.x;
    if (i >= params.vertexCount) {
        return;
    }

    var v = vertices[i];
    v.oldPosition = v.position;
    vertices[i] = v;
}
