import { ShaderRenderer } from "./shader_renderer.js";

export class BloomShaderRenderer extends ShaderRenderer{
    constructor(regl, resource_manager){
        super(
            regl,
            resource_manager,
            `bloom.vert.glsl`,
            `bloom.frag.glsl`
        );
    }


    render(scene_state){

        const scene = scene_state.scene;
        const inputs = [];

        for(const obj of scene.objects){
            if(this.exclude_object(obj)) continue;

            const mesh = this.resource_manager.get_mesh(obj.mesh_reference);

            const { 
                mat_model_view, 
                mat_model_view_projection, 
                mat_normals_model_view 
            } = scene.camera.object_matrices.get(obj);

            inputs.push({
                mesh: mesh,

                mat_model_view_projection : mat_model_view_projection,
                material_base_color: obj.material.color,
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

            //Material data
            material_base_color: regl.prop('material_base_color'),
            threshold:  1.0
        };
    }


}