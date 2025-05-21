
import { ShaderRenderer } from "./shader_renderer.js";



export class MapMixerShaderRenderer extends ShaderRenderer {

    /**
     * Used to render the mix between the 
     * two texture maps: shadows & blinn_phong colors
     * @param {*} regl 
     * @param {ResourceManager} resource_manager 
     */
    constructor(regl, resource_manager){
        super(
            regl, 
            resource_manager, 
            `map_mixer.vert.glsl`, 
            `map_mixer.frag.glsl`
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
     * Render result if the mix of the two texture passed as arguments
     * @param {*} scene_state 
     * @param {*} rendered_shadows a texture containing the shadows information
     * @param {*} rendered_blinn_phong a texture with the objects colors & shading 
     */
    render(scene_state, rendered_shadows, rendered_blinn_phong){

        const scene = scene_state.scene;
        const opaqueInputs = [];
        const transparentInputs = [];

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

                canvas_width: scene_state.frame.framebufferWidth, 
                canvas_height: scene_state.frame.framebufferHeight,

                shadows: rendered_shadows,

                blinn_phong: rendered_blinn_phong,
                is_translucent: is_translucent,
                camera_z: camera_z
            };

            if (is_translucent) {
                transparentInputs.push(entry);
            } else {
                opaqueInputs.push(entry);
            }
        }

        // Draw opaque objects first with depth writes enabled
        this.pipeline(opaqueInputs);
        
        // Sort transparent objects back-to-front and render them with appropriate blending
        transparentInputs.sort((a, b) => b.camera_z - a.camera_z);
        this.pipeline(transparentInputs);
    }

    /**
     * Dynamic depth configuration:
     * - Enable depth testing for all objects
     * - Disable depth writing for transparent objects
     */
    depth(){
        return {
            enable: true,
            mask: (context, props) => !props.is_translucent,
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
            enable: (context, props) => props.is_translucent,
            func: {
                srcRGB: 'src alpha',
                srcAlpha: 'src alpha',
                dstRGB: 'one minus src alpha',
                dstAlpha: 'one minus src alpha'
            }
        };
    }

    uniforms(regl){
        return{
            mat_model_view_projection: regl.prop('mat_model_view_projection'),
            mat_model_view: regl.prop('mat_model_view'),
            mat_normals_model_view: regl.prop('mat_normals_model_view'),

            canvas_width: regl.prop("canvas_width"),
            canvas_height: regl.prop("canvas_height"),

            shadows: regl.prop("shadows"),
            blinn_phong: regl.prop("blinn_phong"),
            is_translucent: regl.prop("is_translucent")
        };
    }
}

