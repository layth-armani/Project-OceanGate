import { ShaderRenderer } from "./shader_renderer.js";
import { ResourceManager } from "../../scene_resources/resource_manager.js";
import { texture_data, light_to_cam_view } from "../../cg_libraries/cg_render_utils.js"

export class BigBlurShaderRenderer extends ShaderRenderer{
    constructor(regl, resource_manager){
        super(
            regl,
            resource_manager,
            `big_gaussian_blur.vert.glsl`,
            `big_gaussian_blur.frag.glsl`
        );
    }


    render(scene_state, texture, horizontal = true){

        const scene = scene_state.scene;
        const inputs = [];

        for(const obj of scene.objects){

            const mesh = this.resource_manager.get_mesh(obj.mesh_reference);
            const texSize = [scene_state.frame.framebufferWidth, scene_state.frame.framebufferHeight];

            const {     
                mat_model_view, 
                mat_model_view_projection, 
                mat_normals_model_view 
            } = scene.camera.object_matrices.get(obj);

            inputs.push({  
                mesh: mesh,

                mat_model_view_projection : mat_model_view_projection,

                image: texture,
                texSize: texSize,
                horizontal: horizontal,

            });

        }

        this.pipeline(inputs);
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

    uniforms(regl){
        return {
            //View related matrix
            mat_model_view_projection: regl.prop('mat_model_view_projection'),

            image: regl.prop('image'),
            horizontal: regl.prop('horizontal'),
            texSize: regl.prop('texSize'),

        };
    }


}