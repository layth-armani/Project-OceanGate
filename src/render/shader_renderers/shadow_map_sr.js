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

            inputs.push({
                mesh: mesh,
                mat_model_view_projection: mat_model_view_projection,
                mat_model_view: mat_model_view,
                material_texture: texture,
                is_textured: is_textured,
                material_base_color: obj.material.color,
                is_translucent: is_translucent
            });
        }

        this.pipeline(inputs);
    }

    cull(){
        return { enable: true }; // don't draw back face
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