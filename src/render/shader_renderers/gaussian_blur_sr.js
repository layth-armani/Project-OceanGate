import { vec2 } from "../../../lib/gl-matrix_3.3.0/esm";
import { ShaderRenderer } from "./shader_renderer";

export class BlurShaderRenderer extends ShaderRenderer{
    constructor(regl, resource_manager){
        super(
            regl,
            resource_manager,
            `gaussian_blur.vert.glsl`,
            `gaussian_blur.frag.glsl`
        );
    }


    render(scene_state, horizontal){

        const scene = scene_state.scene;
        const inputs = [];

        for(const obj of scene.objects){
            if(this.exclude_object(obj)) continue;

            const mesh = this.resource_manager.get_mesh(obj.mesh_reference);
            const {texture, is_textured} = texture_data(obj, this.resource_manager);
            const texSize = vec2.fromValues(texture.width, texture.height);

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
                weight: [0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216],

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
            weight: regl.prop('weight'),
            texSize: regl.prop('texSize'),

        };
    }


}