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
    color : vec3f,
};

struct VertexOutput
{
    @builtin(position)
    position : vec4f,
    @location(0)
    color : vec3f,
};

@vertex
fn vertexMain(input : VertexInput) -> VertexOutput
{
    var output : VertexOutput;

    output.position = camera.viewProjection * vec4f(input.position, 1.0);
    output.color = input.color;

    return output;
}

@fragment
fn fragmentMain(@location(0) color : vec3f) -> @location(0) vec4f
{
    return vec4f(color, 1.0);
}