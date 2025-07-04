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
        this.default_normal_map = this.regl.texture({ width: 1, height: 1, data: [128,128,255,255] });

        // override the pipeline to allow dynamic depth mask & blend enable based on props.is_translucent
        // override the pipeline to allow dynamic depth mask & blend enable based on props.is_translucent
        // use vert_shader and frag_shader loaded by the super class
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

    attributes(regl) {
        return {
            vertex_positions: regl.prop('mesh.vertex_positions'),
            vertex_normal: regl.prop('mesh.vertex_normals'),
            vertex_tex_coords: regl.prop('mesh.vertex_tex_coords'),
            // Use default values if tangent/binormal attributes are missing
            vertex_tangent: (context, props) => 
                props.mesh.vertex_tangents || regl.buffer(new Array(props.mesh.vertex_positions.length).fill([1, 0, 0])),
            vertex_binormal: (context, props) => 
                props.mesh.vertex_binormals || regl.buffer(new Array(props.mesh.vertex_positions.length).fill([0, 1, 0]))
        };
    }

    /**
     * Render the objects of the scene_state with its shader
     * @param {*} scene_state 
     */
    render(scene_state){

        const scene = scene_state.scene;
        let ambient_factor = scene.ambient_factor;

        scene.lights.forEach(light => {

            const inputs = [];

            // Transform light position into camera space
            const light_position_cam = light_to_cam_view(light.position, scene.camera.mat.view);

            for (const obj of scene.objects) {
                if (this.exclude_object(obj)) continue;

                const mesh = this.resource_manager.get_mesh(obj.mesh_reference);
                const {texture, is_textured} = texture_data(obj, this.resource_manager);
                const is_translucent = obj.material.is_translucent;
                const apply_normal_map = obj.material.apply_normal_map;
                

                let normal_map = this.default_normal_map;
                if (apply_normal_map) {
                    normal_map = this.resource_manager.get_texture(obj.material.normal_map)     
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
                    camera_z,
                };

                inputs.push(entry)
            }

            this.pipeline(inputs);
        });
    }

    exclude_object(obj){
        return obj.material.properties.includes('no_blinn_phong');
    }

    // dynamic depth: write only when not translucent
    depth(){
        return {
            enable: true,
            mask: true,
            func: '<='
        };
    }

    // dynamic blending: only enable for translucent
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
            light_position: regl.prop('light_position'),
            light_color: regl.prop('light_color'),
            ambient_factor: regl.prop('ambient_factor'),
            material_texture: regl.prop('material_texture'),
            is_textured: regl.prop('is_textured'),
            material_base_color: regl.prop('material_base_color'),
            is_translucent: regl.prop('is_translucent'),
            material_shininess: regl.prop('material_shininess'),
            apply_normal_map: regl.prop('apply_normal_map'),
            normal_map: regl.prop('normal_map'),
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
