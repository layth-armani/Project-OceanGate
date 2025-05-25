import { texture_data } from "../../cg_libraries/cg_render_utils.js";
import { ResourceManager } from "../../scene_resources/resource_manager.js";
import { ShaderRenderer } from "./shader_renderer.js";

export class ShadowMapShaderRenderer extends ShaderRenderer {
    /**
     * Used to compute distance of a fragment from the eyes 
     * of the camera. It has application in generating the 
     * shadows cube map.
     * @param {*} regl 
     * @param {ResourceManager} resource_manager 
     */
    constructor(regl, resource_manager){
        super(
            regl, 
            resource_manager, 
            `shadow_map.vert.glsl`, 
            `shadow_map.frag.glsl`
        );
        this.pipeline = regl({
            vert: this.vert_shader,
            frag: this.frag_shader,
            attributes: this.attributes(regl),
            uniforms: this.uniforms(regl),
            depth: this.depth(),            // uses dynamic mask
            blend: this.blend(),            // uses dynamic enable
            elements: regl.prop('mesh.faces'),
            cull: this.cull()
        });
    }
    
    /**
     * Render the scene in greyscale using the distance between the camera and the fragment.
     * From black (distance = 0) to white.
     * @param {*} scene_state 
     */
    render(scene_state){
        const scene = scene_state.scene;
        const inputs = [];


        for (const obj of scene.objects) {
            const mesh = this.resource_manager.get_mesh(obj.mesh_reference);
            const {texture, is_textured} = texture_data(obj, this.resource_manager);
            const is_translucent = obj.material.is_translucent;
            
            const { 
                mat_model_view, 
                mat_model_view_projection
            } = scene.camera.object_matrices.get(obj);

            const camera_z = mat_model_view[14];

            const entry = {
                mesh,
                mat_model_view_projection,
                mat_model_view,
                material_texture: texture,
                is_textured,
                is_translucent,
                camera_z
            };

            inputs.push(entry)
        }

        this.pipeline(inputs);

    }

    cull(){
        return { enable: true, face: 'back'};
    }

    depth(){
        return {
            enable: true,
            mask: true,
            func: '<='
        };
    }

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
        return {
            mat_model_view_projection: regl.prop('mat_model_view_projection'),
            mat_model_view: regl.prop('mat_model_view'),
            material_texture: regl.prop('material_texture'),
            is_textured: regl.prop('is_textured'),
            material_base_color: regl.prop('material_base_color'),
            is_translucent: regl.prop('is_translucent')
        };
    }
}