import { texture_data, light_to_cam_view } from "../../cg_libraries/cg_render_utils.js"
import { ResourceManager } from "../../scene_resources/resource_manager.js";
import { ShaderRenderer } from "./shader_renderer.js"

export class BlinnPhongShaderRenderer extends ShaderRenderer {

    /**
     * Its render function can be used to render a scene with the blinn-phong model
     * @param {*} regl 
     * @param {ResourceManager} resource_manager 
     */
    constructor(regl, resource_manager){
        super(
            regl, 
            resource_manager, 
            `blinn_phong.vert.glsl`, 
            `blinn_phong.frag.glsl`
        );

        // override the pipeline to allow dynamic depth mask & blend enable based on props.is_translucent
        // override the pipeline to allow dynamic depth mask & blend enable based on props.is_translucent
        // use vert_shader and frag_shader loaded by the super class
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
     * Render the objects of the scene_state with its shader
     * @param {*} scene_state 
     */
    render(scene_state){

        const scene = scene_state.scene;
        let ambient_factor = scene.ambient_factor;

        scene.lights.forEach(light => {

            const opaqueInputs = [];
            const transparentInputs = [];

            // Transform light position into camera space
            const light_position_cam = light_to_cam_view(light.position, scene.camera.mat.view);

            for (const obj of scene.objects) {
                if (this.exclude_object(obj)) continue;

                const mesh = this.resource_manager.get_mesh(obj.mesh_reference);
                const {texture, is_textured} = texture_data(obj, this.resource_manager);
                const is_translucent = obj.material.is_translucent;
                const apply_normal_map = obj.material.apply_normal_map;

                // default flat normal map if needed
                let normal_map = this.regl.texture({ width: 1, height: 1, data: [128,128,255,255] });
                if (apply_normal_map) {
                    normal_map = obj.material.normal_map 
                        ? this.resource_manager.get_texture(obj.material.normal_map)
                        : this.#get_texture_from_array(
                            this.#createFlatNormalMap(texture.width, texture.height),
                            texture.width, texture.height
                        );
                }

                const { mat_model_view, mat_model_view_projection, mat_normals_model_view } = scene.camera.object_matrices.get(obj);

                // compute camera-space depth from model-view matrix (z of origin)
                const camera_z = mat_model_view[14];

                const entry = {
                    mesh,
                    mat_model_view_projection,
                    mat_model_view,
                    mat_normals_model_view,
                    light_position: light_position_cam,
                    light_color: light.color,
                    ambient_factor,
                    material_texture: texture,
                    is_textured,
                    is_translucent,
                    material_base_color: obj.material.color,
                    material_shininess: obj.material.shininess,
                    apply_normal_map,
                    normal_map,
                    camera_z
                };

                if (is_translucent) {
                    transparentInputs.push(entry);
                } else {
                    opaqueInputs.push(entry);
                }
            }

            // 1) draw opaque first (depth-write enabled)
            this.pipeline(opaqueInputs);
            // ambient only for first pass
            ambient_factor = 0;

            // 2) sort transparent back-to-front by camera_z
            transparentInputs.sort((a, b) => b.camera_z - a.camera_z);
            // draw transparent (depth-write disabled, blend enabled)
            this.pipeline(transparentInputs);
        });
    }

    exclude_object(obj){
        return obj.material.properties.includes('no_blinn_phong');
    }

    // dynamic depth: write only when not translucent
    depth(){
        return {
            enable: true,
            mask: (context, props) => !props.is_translucent,
            func: '<='
        };
    }

    // dynamic blending: only enable for translucent
    blend(){
        return {
            enable: (context, props) => props.is_translucent,
            func: {
                srcRGB: 'src alpha', srcAlpha: 'src alpha',
                dstRGB: 'one minus src alpha', dstAlpha: 'one minus src alpha'
            }
        };
    }

    uniforms(regl){
        return{
            mat_model_view_projection: regl.prop('mat_model_view_projection'),
            mat_model_view: regl.prop('mat_model_view'),
            mat_normals_model_view: regl.prop('mat_normals_model_view'),
            light_position: regl.prop('light_position'),
            light_color: regl.prop('light_color'),
            ambient_factor: regl.prop('ambient_factor'),
            material_texture: regl.prop('material_texture'),
            is_textured: regl.prop('is_textured'),
            material_base_color: regl.prop('material_base_color'),
            is_translucent: regl.prop('is_translucent'),
            material_shininess: regl.prop('material_shininess'),
            apply_normal_map: regl.prop('apply_normal_map'),
            normal_map: regl.prop('normal_map')
        };
    }

    #createFlatNormalMap(width, height) {
        const flatNormal = new Float32Array(width * height * 4);
        for (let i = 0; i < width * height; i++) {
            flatNormal[i*4+0] = 0.5;
            flatNormal[i*4+1] = 0.5;
            flatNormal[i*4+2] = 1.0;
            flatNormal[i*4+3] = 1.0;
        }
        return flatNormal;
    }

    #get_texture_from_array(array, width, height) {
        return this.regl.texture({ data: array, width, height, format: 'rgba', type: 'float' });
    }
}
