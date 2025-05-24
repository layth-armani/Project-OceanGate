import { ShaderRenderer } from "./shader_renderer.js";

export const DEFAULT_BLOOM_THRESHOLD = 0.75;
export const MAX_BLOOM_THRESHOLD = 1;

export class BloomShaderRenderer extends ShaderRenderer{
    constructor(regl, resource_manager){
        super(
            regl,
            resource_manager,
            `bloom.vert.glsl`,
            `bloom.frag.glsl`
        );
        
        // Override pipeline to support transparency sorting
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

    render(scene_state, texture, threshold){
        const scene = scene_state.scene;
        const inputs = [];

        for(const obj of scene.objects){
            if(this.exclude_object(obj)) continue;

            const mesh = this.resource_manager.get_mesh(obj.mesh_reference);
            const is_translucent = obj.material.is_translucent || false;

            const { 
                mat_model_view, 
                mat_model_view_projection, 
                mat_normals_model_view 
            } = scene.camera.object_matrices.get(obj);
            
            // Compute camera-space depth for sorting
            const camera_z = mat_model_view[14];

            const entry = {
                mesh: mesh,
                mat_model_view_projection: mat_model_view_projection,
                mat_model_view: mat_model_view,
                mat_normals_model_view: mat_normals_model_view,
                threshold: threshold,
                texture: texture,
                is_translucent: is_translucent,
                camera_z: camera_z
            };

            inputs.push(entry)
        }

        // Draw opaque objects first
        this.pipeline(inputs);
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

    exclude_object(obj){
        return obj.material.properties.includes('no_bloom');
    }

    depth(){
        return {
            enable: true,
            mask: true,
            func: '<='
        };
    }

    uniforms(regl){
        return {
            //View related matrix
            mat_model_view_projection: regl.prop('mat_model_view_projection'),

            //Material data
            material_base_color: regl.prop('material_base_color'),
            threshold: regl.prop('threshold'),
            texture: regl.prop('texture'),
            is_translucent: regl.prop('is_translucent')
        };
    }
}