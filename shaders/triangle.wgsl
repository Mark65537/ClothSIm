struct Camera
{
    viewProjection : mat4x4<f32>,
};

@group(0) @binding(0)
var<uniform> camera : Camera;

struct VertexInput
{
    @location(0)
    position : vec3f,
    @location(1)
    normal : vec3f,
};

struct VertexOutput
{
    @builtin(position)
    position : vec4f,
    @location(0)
    normal : vec3f,
};

@vertex
fn vertexMain(input : VertexInput) -> VertexOutput
{
    var output : VertexOutput;

    output.position = camera.viewProjection * vec4f(input.position, 1.0);
    output.normal = input.normal;

    return output;
}

@fragment
fn fragmentMain(@location(0) normal : vec3f) -> @location(0) vec4f
{
    let N = normalize(normal);
    let L = normalize(vec3f(0.45, 1.0, 0.35));
    let diff = abs(dot(N, L));
    let base = vec3f(0.88, 0.32, 0.28);
    return vec4f(base * (0.28 + 0.72 * diff), 1.0);
}