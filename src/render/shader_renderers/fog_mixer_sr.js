import { ShaderRenderer } from "./shader_renderer.js";

export const FOG_MIN_DISTANCE = 10;
export const FOG_MAX_DISTANCE = 70;
export const FOG_DEFAULT_DISTANCE = 30;

export class FogMixerShaderRenderer extends ShaderRenderer {

    /**
     * Used to render the mix between the
     * distance-based fog and scene colors
     * @param {*} regl 
     * @param {ResourceManager} resource_manager 
     */
    constructor(regl, resource_manager){
        super(
            regl, 
            resource_manager, 
            `fog_mixer.vert.glsl`, 
            `fog_mixer.frag.glsl`
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
     * @param {*} rendered_distances a texture containing the distance information for fog
     * @param {*} rendered_blinn_phong a texture with the objects colors & shading 
     */
    render(scene_state, rendered_distances, rendered_blinn_phong, fog_distance){

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
                canvas_width: scene_state.frame.framebufferWidth, 
                canvas_height: scene_state.frame.framebufferHeight,

                fog_distance: fog_distance,
                distances: rendered_distances,
                blinn_phong: rendered_blinn_phong,
                is_translucent: is_translucent,
                camera_z: camera_z
            };

            inputs.push(entry)
        }

        this.pipeline(inputs);
        
    }

    /**
     *
     */
    depth(){
        return {
            enable: true,
            mask: true,
            func: '<='
        };
    }

    /**
     * 
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
            canvas_width: regl.prop("canvas_width"),
            canvas_height: regl.prop("canvas_height"),

            fog_distance: regl.prop("fog_distance"),
            distances: regl.prop("distances"),
            blinn_phong: regl.prop("blinn_phong"),
            is_translucent: regl.prop("is_translucent")
        };
    }
}

