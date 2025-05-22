import {texture_data, light_to_cam_view} from "../../cg_libraries/cg_render_utils.js"
import { ResourceManager } from "../../scene_resources/resource_manager.js";
import { EnvironmentCapture } from "../env_capture.js"
import { ShaderRenderer } from "./shader_renderer.js";
import { ShadowMapShaderRenderer } from "./shadow_map_sr.js"


export class ShadowsShaderRenderer extends ShaderRenderer {

    /**
     * Used to produce a black & white map of the shadows of 
     * the scene using the cube map method for a point light
     * @param {*} regl 
     * @param {ResourceManager} resource_manager 
     */
    constructor(regl, resource_manager){
        super(
            regl, 
            resource_manager, 
            `point_light_shadows.vert.glsl`, 
            `point_light_shadows.frag.glsl`
        );
        this.env_capture = new EnvironmentCapture(regl, resource_manager);
        // Here we instanciante the ShadowMapShaderRenderer directly into the ShadowsShaderRenderer 
        // because the latter needs to pass shadow_map render function to the env_capture to generate the cube_map 
        this.shadow_map = new ShadowMapShaderRenderer(regl, resource_manager);

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
     * The result is a combination of all the light's cast shadows.
     * White means "shadows" black means "no shadows"
     * @param {*} scene_state 
     */
    render(scene_state){

        const scene = scene_state.scene;
        const inputs = [];
      

        // For every light build a shadow map and do a render of the shadows
        this.regl.clear({color: [0,0,0,1]});

        const num_lights = scene.lights.length;

        scene.lights.forEach(light => {
            // Transform light position into camera space
            const light_position_cam = light_to_cam_view(light.position, scene.camera.mat.view);

            // Computation of the cube map from the light
            const cube_shadowmap = this.compute_shadow_cube_map(scene_state, light);

            for (const obj of scene.objects) {

                if(this.exclude_object(obj)) continue;

                const mesh = this.resource_manager.get_mesh(obj.mesh_reference);
                const {texture, is_textured} = texture_data(obj, this.resource_manager);
                const is_translucent = obj.material.is_translucent;
                
                const { 
                    mat_model_view, 
                    mat_model_view_projection, 
                    mat_normals_model_view 
                } = scene.camera.object_matrices.get(obj);

                const camera_z = mat_model_view[14];

                const entry = {
                    mesh: mesh,

                    mat_model_view_projection: mat_model_view_projection,
                    mat_model_view: mat_model_view,

                    light_position_cam : light_position_cam,
                    num_lights: num_lights,
                    material_texture: texture,
                    is_textured: is_textured,
                    material_base_color: obj.material.color,
                    is_translucent: is_translucent,

                    cube_shadowmap: cube_shadowmap,
                    camera_z
                };
    
                inputs.push(entry)
            }
            this.pipeline(inputs);

        });
    }


    exclude_object(obj){
        // Exclude object with environment material: the sky does not cast shadows
        return obj.material.properties.includes('environment');
    }

    compute_shadow_cube_map(scene_state, light){
        const light_position = light.position;

        this.env_capture.capture_scene_cubemap(
            scene_state, 
            light_position, // position from which to render the cube map
            (s_s) => {this.shadow_map.render(s_s)} // function used to render the cube map
        );
        return this.env_capture.env_cubemap;
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
        return{
            // View (camera) related matrix
            mat_model_view_projection: regl.prop('mat_model_view_projection'),
            mat_model_view: regl.prop('mat_model_view'),
    
            // Light
            light_position_cam: regl.prop('light_position_cam'),
            num_lights: regl.prop('num_lights'),

            // Cube map
            cube_shadowmap: regl.prop('cube_shadowmap'),
            material_texture: regl.prop('material_texture'),
            is_textured: regl.prop('is_textured'),
            material_base_color: regl.prop('material_base_color'),
            is_translucent: regl.prop('is_translucent')
        };
    }

}
