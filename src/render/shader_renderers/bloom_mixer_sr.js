
import { ShaderRenderer } from "./shader_renderer.js";

export class BloomMixerShaderRenderer extends ShaderRenderer {

    /**
     * Used to render the mix between the 
     * two texture maps: base shadows and bloom effects
     * @param {*} regl 
     * @param {ResourceManager} resource_manager 
     */
    constructor(regl, resource_manager){
        super(
            regl, 
            resource_manager, 
            `bloom_mixer.vert.glsl`, 
            `bloom_mixer.frag.glsl`
        );
        
        // Override the pipeline to support transparency sorting
        this.pipeline = regl({
            vert: this.vert_shader,
            frag: this.frag_shader,
            attributes: this.attributes(regl),
            uniforms: this.uniforms(regl),
            depth: this.depth(),
            blend: this.blend(),
            elements: regl.prop('mesh.faces'),
            cull: this.cull()
        });
    }
    
    /**
     * Render result of the mix of the two texture passed as arguments
     * @param {*} scene_state 
     * @param {*} rendered_base_shadows a texture containing the base scene with shadows
     * @param {*} rendered_bloom a texture with bloom effects to be added
     */
    render(scene_state, rendered_base_shadows, rendered_bloom){
        const scene = scene_state.scene;
        const inputs = [];
        

        for (const obj of scene.objects) {
            const mesh = this.resource_manager.get_mesh(obj.mesh_reference);
            const is_translucent = obj.material.is_translucent || false;
            
            const { 
                mat_model_view, 
                mat_model_view_projection, 
                mat_normals_model_view 
            } = scene.camera.object_matrices.get(obj);

            // Compute camera-space depth for sorting
            const camera_z = mat_model_view[14];

            const entry = {
                mesh: mesh,
                mat_model_view_projection: mat_model_view_projection,
                mat_model_view: mat_model_view,
                mat_normals_model_view: mat_normals_model_view,
                base_shadows: rendered_base_shadows,
                bloom: rendered_bloom,
                is_translucent: is_translucent,
                camera_z: camera_z
            };

            inputs.push(entry)
        }

        // Draw opaque objects first with depth writes enabled
        this.pipeline(inputs);
        
    }

    /**
     * Dynamic depth configuration:
     * - Enable depth testing for all objects
     * - Disable depth writing for transparent objects
     */
    depth(){
        return {
            enable: true,
            mask: true,
            func: '<='
        };
    }

    /**
     * Dynamic blend configuration:
     * - Enable blending only for transparent objects
     * - Use alpha blending for transparent parts
     */
    blend(){
        return {
              enable: true,
              func: {
                srcRGB: 'src alpha',
                srcAlpha: 'src alpha',
                dstRGB: 'one minus src alpha',
                dstAlpha: 'one minus src alpha'
              }
            }
    }

    uniforms(regl){
        return{
            mat_model_view_projection: regl.prop('mat_model_view_projection'),
            mat_model_view: regl.prop('mat_model_view'),
            mat_normals_model_view: regl.prop('mat_normals_model_view'),
            base_shadows: regl.prop("base_shadows"),
            bloom: regl.prop("bloom"),
            is_translucent: regl.prop("is_translucent")
        };
    }
}

