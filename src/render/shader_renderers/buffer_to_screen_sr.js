import { ShaderRenderer } from "./shader_renderer.js";

export class BufferToScreenShaderRenderer extends ShaderRenderer {

    /**
     * Its render function can be used to display a buffer's content on the canvas
     * @param {*} regl 
     * @param {ResourceManager} resource_manager 
     */
    constructor(regl, resource_manager){
        super(
            regl, 
            resource_manager, 
            `buffer_to_screen.vert.glsl`, 
            `buffer_to_screen.frag.glsl`
        );
        
        // Initialize the pipeline with support for transparency
        this.pipeline = regl({
            attributes: {
                vertex_positions: regl.prop('mesh_quad_2d.vertex_positions')
            },
            elements: regl.prop('mesh_quad_2d.faces'),
            uniforms: {
                buffer_to_draw: regl.prop('buffer_to_draw'),
                is_translucent: regl.prop('is_translucent')
            },
            depth: {
                enable: true,
                mask: true,
                func: '<='
            },
            blend: {
              enable: true,
              func: {
                srcRGB: 'src alpha',
                srcAlpha: 'src alpha',
                dstRGB: 'one minus src alpha',
                dstAlpha: 'one minus src alpha'
              }
            },
            vert: this.vert_shader,
            frag: this.frag_shader
        });
    }

    /**
     * Enhanced version that can handle multiple buffers with transparency sorting
     * @param {*} mesh_quad_2d a basic square mesh
     * @param {*} buffers_to_draw array of {buffer, depth, is_translucent} objects or a single buffer
     */
    render(mesh_quad_2d, buffers_to_draw){
        // Handle both single buffer and array of buffers
        const bufferEntries = Array.isArray(buffers_to_draw) ? buffers_to_draw : [{ 
            buffer: buffers_to_draw, 
            depth: 0,
            is_translucent: false 
        }];

        const inputs = [];

        // Process each buffer
        for (const entry of bufferEntries) {
            const buffer = entry.buffer || entry;
            const depth = entry.depth || 0;
            const is_translucent = entry.is_translucent || false;

            const renderInput = {
                mesh_quad_2d: mesh_quad_2d,
                buffer_to_draw: buffer,
                is_translucent: is_translucent,
                depth: depth
            };

            inputs.push(entry)
        }

        this.pipeline(inputs);
    }
}
