struct VertexInput
{
    @location(0)
    position : vec3f,
};

struct VertexOutput
{
    @builtin(position)
    position : vec4f,
};

@vertex
fn vertexMain(input : VertexInput) -> VertexOutput
{
    var output : VertexOutput;

    output.position = vec4f(input.position, 1.0);

    return output;
}

@fragment
fn fragmentMain() -> @location(0) vec4f
{
    return vec4(1.0, 0.0, 0.0, 1.0);
}