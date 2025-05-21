import { ShaderRenderer } from "./shader_renderer.js";

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

    render(scene_state, texture){
        const scene = scene_state.scene;
        const opaqueInputs = [];
        const transparentInputs = [];
        const threshold = 0.75;

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

            if (is_translucent) {
                transparentInputs.push(entry);
            } else {
                opaqueInputs.push(entry);
            }
        }

        // Draw opaque objects first
        this.pipeline(opaqueInputs);
        
        // Sort transparent objects back to front and render them
        transparentInputs.sort((a, b) => b.camera_z - a.camera_z);
        this.pipeline(transparentInputs);
    }

    blend(){
        return {
            enable: true,
            func: {
                srcRGB: (context, props) => props.is_translucent ? 'src alpha' : 1,
                srcAlpha: (context, props) => props.is_translucent ? 'src alpha' : 1,
                dstRGB: (context, props) => props.is_translucent ? 'one minus src alpha' : 1,
                dstAlpha: (context, props) => props.is_translucent ? 'one minus src alpha' : 1
            }
        };
    }

    exclude_object(obj){
        return obj.material.properties.includes('no_bloom');
    }

    depth(){
        return {
            enable: true,
            mask: (context, props) => !props.is_translucent,
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