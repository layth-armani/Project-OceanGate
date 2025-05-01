import {texture_data, light_to_cam_view} from "../../cg_libraries/cg_render_utils.js"
import { ResourceManager } from "../../scene_resources/resource_manager.js";
import {ShaderRenderer} from "./shader_renderer.js"


export class TerrainShaderRenderer extends ShaderRenderer {

    /**
     * Dedicated blinn_phong shader for terrain rendering.
     * The main difference is, that it assigned different color to
     * the object based on the altitude of the fragment
     * @param {*} regl 
     * @param {ResourceManager} resource_manager 
     */
    constructor(regl, resource_manager){
        super(
            regl, 
            resource_manager, 
            `terrain.vert.glsl`, 
            `terrain.frag.glsl`
        );
    }
    
    /**
     * Render all objects that have a "terrain" material.
     * @param {*} scene_state 
     */
    render(scene_state) {
        const scene = scene_state.scene;
        const inputs = [];

        let ambient_factor = scene.ambient_factor;

        scene.lights.forEach(light => {
            // Transform light position into camera space
            const light_position_cam = light_to_cam_view(light.position, scene.camera.mat.view);
            

            for (const obj of scene.objects) {
                if (this.exclude_object(obj)) continue;

                const mesh = this.resource_manager.get_mesh(obj.mesh_reference);
                const { texture, is_textured } = texture_data(obj, this.resource_manager);

                const normal_map = obj.material.normal_map 
                    ? this.resource_manager.get_texture('normal_map')
                    : this.#get_texture_from_array(
                        this.#createFlatNormalMap(texture.width, texture.height),
                        texture.width,
                        texture.height 
                    );

                const { 
                    mat_model_view, 
                    mat_model_view_projection, 
                    mat_normals_model_view 
                } = scene.camera.object_matrices.get(obj);

                inputs.push({
                    mesh: mesh,

                    mat_model_view_projection: mat_model_view_projection,
                    mat_model_view: mat_model_view,
                    mat_normals_model_view: mat_normals_model_view,

                    light_position: light_position_cam,
                    light_color: light.color,

                    ambient_factor: [ambient_factor,ambient_factor,ambient_factor],

                    material_texture: texture,
                    material_normal_map: normal_map, 
                    is_textured: is_textured,

                    material_color: obj.material.color,
                    material_shininess: obj.material.shininess,
                });
            }

            
            // Set ambient factor to 0 so it is only applied once
            this.pipeline(inputs);
        });
    }

    exclude_object(obj){
        // Exclude all non terrain objects
        return !obj.material.properties.includes('terrain');
    }

    depth(){
        // Use z-buffer
        return {
            enable: true,
            mask: true,
            func: '<=',
        };
    }

    blend(){
        // Additive blend mode
        return {
            enable: true,
            func: {
                src: 1,
                dst: 1,
            },
        };
    }

    uniforms(regl) {
        return {
            mat_model_view_projection: regl.prop('mat_model_view_projection'),
            mat_model_view: regl.prop('mat_model_view'),
            mat_normals_model_view: regl.prop('mat_normals_model_view'),
            light_position: regl.prop('light_position'),
            light_color: regl.prop('light_color'),
            ambient_factor: regl.prop('ambient_factor'),
            material_texture: regl.prop('material_texture'),
            material_normal_map: regl.prop('material_normal_map'), 
            material_color: regl.prop('material_color'),
            material_shininess: regl.prop('material_shininess')
        };
    }

    #createFlatNormalMap(width, height) {
        const flatNormal = new Float32Array(width * height * 4); 
        for (let i = 0; i < width * height; i++) {
            flatNormal[i * 4 + 0] = 0.5; 
            flatNormal[i * 4 + 1] = 0.5; 
            flatNormal[i * 4 + 2] = 1.0; 
            flatNormal[i * 4 + 3] = 1.0; 
        }
        return flatNormal;
    }
    
    #get_texture_from_array(array, width, height) {
        return this.regl.texture({
            data: array,
            width: width,
            height: height,
            format: 'rgba',
            type: 'float'
        });
    }  
}
