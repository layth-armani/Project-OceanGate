
import { ResourceManager } from "../../scene_resources/resource_manager.js";
import { ShaderRenderer } from "./shader_renderer.js";
import { texture_data, light_to_cam_view } from "../../cg_libraries/cg_render_utils.js"


export class PreprocessingShaderRenderer extends ShaderRenderer {

    /**
     * Used to run a preprocessing pass that will fill the 
     * z-buffer and pure black default color to all objects
     * @param {*} regl 
     * @param {ResourceManager} resource_manager 
     */
    constructor(regl, resource_manager){
      // load into the resources manager the shaders that are hardcoded
      resource_manager.resources["pre_processing.vert.glsl"] = pre_processing_vertex_shader();
      resource_manager.resources["pre_processing.frag.glsl"] = pre_processing_fragment_shader();

      super(
          regl, 
          resource_manager, 
          `pre_processing.vert.glsl`, 
          `pre_processing.frag.glsl`
      );
    }

    /**
     * Fill the z-buffer for all the objects in the scene and 
     * color all these objects in pure black
     * @param {*} scene_state 
     */
    render(scene_state){
        const scene = scene_state.scene;
        const inputs = [];

        for (const obj of scene.objects) {

            if(this.exclude_object(obj)) continue;
            const {texture, is_textured} = texture_data(obj, this.resource_manager);
            const is_translucent = obj.material.is_translucent;
            const mesh = this.resource_manager.get_mesh(obj.mesh_reference);

            const { 
                mat_model_view, 
                mat_model_view_projection, 
                mat_normals_model_view 
            } = scene.camera.object_matrices.get(obj);

            inputs.push({
                mesh: mesh,
                material_texture: texture,
                is_textured,
                is_translucent,
                mat_model_view_projection: mat_model_view_projection,
            });

        }
        
        this.pipeline(inputs);
    }

    uniforms(regl){
        return{
            mat_model_view_projection: regl.prop('mat_model_view_projection'),
            material_texture: regl.prop('material_texture'),
            is_textured: regl.prop('is_textured'),
            is_translucent: regl.prop('is_translucent'),
            
        };
    }

    // Overwrite the pipeline
    init_pipeline(){
        const regl = this.regl;
        return regl({

            attributes: {
              vertex_positions: regl.prop('mesh.vertex_positions'), 
              vertex_tex_coords: regl.prop('mesh.vertex_tex_coords'),
            },
          
            elements: regl.prop('mesh.faces'),
          
            blend: {
              enable: true,
              func: {
                srcRGB: 'src alpha',
                srcAlpha: 'src alpha',
                dstRGB: 'one minus src alpha',
                dstAlpha: 'one minus src alpha'
              }
            },
            depth: {
              enable: true,
              mask: true // Don't write to depth buffer for transparent objects
            },
          
            uniforms: this.uniforms(regl),
          
            vert: this.vert_shader,
            frag: this.frag_shader,
          });
    }

}

// Hard coded shaders, equivalent to defining them in a separate glsl file

function pre_processing_vertex_shader(){
  return `
          precision mediump float;
      
          attribute vec3 vertex_positions;
          attribute vec2 vertex_tex_coords;

          uniform mat4 mat_model_view_projection;

          varying vec2 v2f_uv;
      
          void main() {
            v2f_uv = vertex_tex_coords;
            gl_Position = mat_model_view_projection * vec4(vertex_positions, 1.0);
          }
        `;
}

function pre_processing_fragment_shader(){
  return `
          precision mediump float;
          
          uniform sampler2D material_texture;
          uniform bool is_textured;
          uniform bool is_translucent;
      
          varying vec2 v2f_uv;

          void main() {
            float alpha = 1.;
            if (is_textured){
                alpha = texture2D(material_texture, v2f_uv).a;
            }
            if(is_translucent && alpha <= 0.1) {
                discard;
            }

            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); // pure black
          }
        `;
}