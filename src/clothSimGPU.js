import { createConstraints, constraintsToGPUBuffer } from "./constraint.js";

const VERTEX_STRIDE = 32;
const PARAMS_SIZE = 48;
const BATCH_OFFSET = 36;
const WORKGROUP_SIZE = 64;
const CONSTRAINT_BATCHES = 6;
const CONSTRAINT_ITERATIONS = 5;
const DEFAULT_DAMPING = 0.995;

function verticesToSimBuffer(vertices) {
    const data = new ArrayBuffer(vertices.length * VERTEX_STRIDE);
    const view = new DataView(data);

    for (let i = 0; i < vertices.length; i++) {
        const v = vertices[i];
        const offset = i * VERTEX_STRIDE;
        view.setFloat32(offset + 0, v.position.x, true);
        view.setFloat32(offset + 4, v.position.y, true);
        view.setFloat32(offset + 8, v.position.z, true);
        view.setFloat32(offset + 12, v.isPinned ? 1 : 0, true);
        view.setFloat32(offset + 16, v.oldPosition.x, true);
        view.setFloat32(offset + 20, v.oldPosition.y, true);
        view.setFloat32(offset + 24, v.oldPosition.z, true);
    }

    return data;
}

function packSimParams(params) {
    const data = new ArrayBuffer(PARAMS_SIZE);
    const f32 = new Float32Array(data);
    const u32 = new Uint32Array(data);

    f32[0] = params.dt;
    f32[1] = params.accelX;
    f32[2] = params.accelY;
    f32[3] = params.accelZ;
    f32[4] = params.damping;
    u32[5] = params.centerIndex;
    f32[6] = params.waveZ;
    u32[7] = params.vertexCount;
    u32[8] = params.constraintCount;
    u32[9] = params.batch;

    return data;
}

async function loadComputeShader(device) {
    const code = await fetch("shaders/cloth.wgsl").then(r => r.text());
    return device.createShaderModule({ code });
}

function createSimPipelineLayout(device) {
    const bindGroupLayout = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: { type: "uniform" },
            },
            {
                binding: 1,
                visibility: GPUShaderStage.COMPUTE,
                buffer: { type: "storage" },
            },
            {
                binding: 2,
                visibility: GPUShaderStage.COMPUTE,
                buffer: { type: "read-only-storage" },
            },
        ],
    });

    const pipelineLayout = device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
    });

    return { pipelineLayout, bindGroupLayout };
}

function createComputePipeline(device, shader, entryPoint, pipelineLayout) {
    return device.createComputePipeline({
        layout: pipelineLayout,
        compute: {
            module: shader,
            entryPoint,
        },
    });
}

/**
 * GPU-симуляция ткани: Verlet-интеграция и PBD-ограничения через compute shader.
 */
export async function createClothSimulation(device, grid) {
    const { vertices, COLS, ROWS } = grid;
    const constraints = createConstraints(vertices, COLS, ROWS);
    const vertexCount = vertices.length;
    const constraintCount = constraints.length;
    const centerIndex = Math.floor(vertexCount / 2);

    const vertexBuffer = device.createBuffer({
        size: vertexCount * VERTEX_STRIDE,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(vertexBuffer, 0, verticesToSimBuffer(vertices));

    const constraintBuffer = device.createBuffer({
        size: constraintCount * 16,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(constraintBuffer, 0, constraintsToGPUBuffer(constraints));

    const paramsBuffer = device.createBuffer({
        size: PARAMS_SIZE,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const paramsStagingBuffer = device.createBuffer({
        size: PARAMS_SIZE,
        usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });

    const batchPatchBuffers = Array.from({ length: CONSTRAINT_BATCHES }, (_, batch) => {
        const buffer = device.createBuffer({
            size: 4,
            usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(buffer, 0, new Uint32Array([batch]));
        return buffer;
    });

    const shader = await loadComputeShader(device);
    const { pipelineLayout, bindGroupLayout } = createSimPipelineLayout(device);

    const integratePipeline = createComputePipeline(device, shader, "integrate", pipelineLayout);
    const pinWavePipeline = createComputePipeline(device, shader, "pinWave", pipelineLayout);
    const solvePipeline = createComputePipeline(device, shader, "solveConstraints", pipelineLayout);
    const syncPipeline = createComputePipeline(device, shader, "syncOld", pipelineLayout);

    const bindGroup = device.createBindGroup({
        layout: bindGroupLayout,
        entries: [
            { binding: 0, resource: { buffer: paramsBuffer } },
            { binding: 1, resource: { buffer: vertexBuffer } },
            { binding: 2, resource: { buffer: constraintBuffer } },
        ],
    });

    const vertexWorkgroups = Math.ceil(vertexCount / WORKGROUP_SIZE);
    const constraintWorkgroups = Math.ceil(constraintCount / WORKGROUP_SIZE);

    const simState = {
        dt: 0,
        accelX: 0,
        accelY: 0,
        accelZ: 0,
        waveZ: 0,
    };

    function writeStagingParams(batch = 0) {
        device.queue.writeBuffer(paramsStagingBuffer, 0, packSimParams({
            ...simState,
            damping: DEFAULT_DAMPING,
            centerIndex,
            vertexCount,
            constraintCount,
            batch,
        }));
    }

    function step(encoder, substeps) {
        writeStagingParams(0);

        for (let s = 0; s < substeps; s++) {
            encoder.copyBufferToBuffer(paramsStagingBuffer, 0, paramsBuffer, 0, PARAMS_SIZE);

            let pass = encoder.beginComputePass();
            pass.setBindGroup(0, bindGroup);
            pass.setPipeline(integratePipeline);
            pass.dispatchWorkgroups(vertexWorkgroups);
            pass.setPipeline(pinWavePipeline);
            pass.dispatchWorkgroups(1);
            pass.end();

            for (let iter = 0; iter < CONSTRAINT_ITERATIONS; iter++) {
                for (let batch = 0; batch < CONSTRAINT_BATCHES; batch++) {
                    encoder.copyBufferToBuffer(batchPatchBuffers[batch], 0, paramsBuffer, BATCH_OFFSET, 4);

                    pass = encoder.beginComputePass();
                    pass.setBindGroup(0, bindGroup);
                    pass.setPipeline(solvePipeline);
                    pass.dispatchWorkgroups(constraintWorkgroups);
                    pass.end();
                }
            }
        }

        encoder.copyBufferToBuffer(paramsStagingBuffer, 0, paramsBuffer, 0, PARAMS_SIZE);

        const pass = encoder.beginComputePass();
        pass.setBindGroup(0, bindGroup);
        pass.setPipeline(syncPipeline);
        pass.dispatchWorkgroups(vertexWorkgroups);
        pass.end();
    }

    function setParams({ dt, acceleration, waveZ }) {
        simState.dt = dt;
        simState.accelX = acceleration.x;
        simState.accelY = acceleration.y;
        simState.accelZ = acceleration.z;
        simState.waveZ = waveZ;
    }

    return {
        vertexBuffer,
        vertexStride: VERTEX_STRIDE,
        constraintCount,
        step,
        setParams,
    };
}
