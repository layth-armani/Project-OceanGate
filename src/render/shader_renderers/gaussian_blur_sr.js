import { ShaderRenderer } from "./shader_renderer.js";
import { ResourceManager } from "../../scene_resources/resource_manager.js";
import { texture_data, light_to_cam_view } from "../../cg_libraries/cg_render_utils.js"

export class BlurShaderRenderer extends ShaderRenderer{
    constructor(regl, resource_manager){
        super(
            regl,
            resource_manager,
            `gaussian_blur.vert.glsl`,
            `gaussian_blur.frag.glsl`
        );
        
        // Override pipeline to support transparency properly
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

    render(scene_state, texture, horizontal = true){
        const scene = scene_state.scene;
        const inputs = [];
        
        const texSize = [scene_state.frame.framebufferWidth, scene_state.frame.framebufferHeight];

        for(const obj of scene.objects){
            if(this.exclude_object(obj)) continue;

            const mesh = this.resource_manager.get_mesh(obj.mesh_reference);
            const is_translucent = obj.material.is_translucent || false;

            const {     
                mat_model_view, 
                mat_model_view_projection
            } = scene.camera.object_matrices.get(obj);

            // Compute camera-space depth for sorting
            const camera_z = mat_model_view[14];

            const entry = {  
                mesh: mesh,
                mat_model_view_projection: mat_model_view_projection,
                image: texture,
                texSize: texSize,
                horizontal: horizontal,
                is_translucent: is_translucent,
                preserve_alpha: true,  // Always preserve alpha in blur operations
                camera_z: camera_z
            };

            inputs.push(entry)
        }

        this.pipeline(inputs);
        
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
            //View related matrix
            mat_model_view_projection: regl.prop('mat_model_view_projection'),
            image: regl.prop('image'),
            horizontal: regl.prop('horizontal'),
            texSize: regl.prop('texSize'),
            is_translucent: regl.prop('is_translucent'),
            preserve_alpha: regl.prop('preserve_alpha')
        };
    }

    exclude_object(obj){
        // Exclude objects that shouldn't be blurred
        return obj.material.properties && obj.material.properties.includes('no_blur');
    }
}