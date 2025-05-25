
import { BlinnPhongShaderRenderer } from "./shader_renderers/blinn_phong_sr.js"
import { FlatColorShaderRenderer } from "./shader_renderers/flat_color_sr.js"
import { MirrorShaderRenderer } from "./shader_renderers/mirror_sr.js"
import { ShadowsShaderRenderer } from "./shader_renderers/shadows_sr.js"
import { ShadowMapShaderRenderer } from "./shader_renderers/shadow_map_sr.js"
import { MapMixerShaderRenderer } from "./shader_renderers/map_mixer_sr.js"
import { FogMixerShaderRenderer } from "./shader_renderers/fog_mixer_sr.js"
import { TerrainShaderRenderer } from "./shader_renderers/terrain_sr.js"
import { PreprocessingShaderRenderer } from "./shader_renderers/pre_processing_sr.js"
import { ResourceManager } from "../scene_resources/resource_manager.js"
import { BloomShaderRenderer } from "./shader_renderers/bloom_sr.js"
import { BlurShaderRenderer } from "./shader_renderers/gaussian_blur_sr.js"
import { BloomMixerShaderRenderer } from "./shader_renderers/bloom_mixer_sr.js"
import { BigBlurShaderRenderer } from "./shader_renderers/big_gaussian_blur_sr.js"
import { AntiBloomShaderRenderer } from "./shader_renderers/anti_bloom_sr.js"

export class SceneRenderer {

    /** 
     * Create a new scene render to display a scene on the screen
     * @param {*} regl the canvas to draw on 
     * @param {ResourceManager} resource_manager 
     */
    constructor(regl, resource_manager) {
        this.regl = regl;
        this.resource_manager = resource_manager;

        this.textures_and_buffers = {};

        // Creates the renderer object for each shader kind
        this.pre_processing = new PreprocessingShaderRenderer(regl, resource_manager);

        this.flat_color = new FlatColorShaderRenderer(regl, resource_manager);
        this.blinn_phong = new BlinnPhongShaderRenderer(regl, resource_manager);
        this.terrain = new TerrainShaderRenderer(regl, resource_manager);

        this.mirror = new MirrorShaderRenderer(regl, resource_manager);
        this.shadow_map = new ShadowMapShaderRenderer(regl, resource_manager);
        this.shadows = new ShadowsShaderRenderer(regl, resource_manager);
        this.map_mixer = new MapMixerShaderRenderer(regl, resource_manager);
        this.bloom_mixer = new BloomMixerShaderRenderer(regl, resource_manager)
        this.fog_mixer = new FogMixerShaderRenderer(regl, resource_manager);
        
        this.bloom = new BloomShaderRenderer(regl,resource_manager);
        this.anti_bloom = new AntiBloomShaderRenderer(regl,resource_manager);
        this.blur = new BlurShaderRenderer(regl,resource_manager);
        this.big_blur = new BigBlurShaderRenderer(regl,resource_manager);
        this.fog_mixer = new FogMixerShaderRenderer(regl, resource_manager);

        // Create textures & buffer to save some intermediate renders into a texture
        this.create_texture_and_buffer("shadows", {});
        this.create_texture_and_buffer("shadows_blurred", {});
        this.create_texture_and_buffer("base", {});
        this.create_texture_and_buffer("with_shadows", {});
        this.create_texture_and_buffer("bloom", {});
        this.create_texture_and_buffer("blurred_bloom", {});
        this.create_texture_and_buffer("scene_with_bloom", {});
        this.create_texture_and_buffer("distances", {}); 
        
        //this.create_texture_and_buffer("boids", {width: boids_count, height: 4})

    }

    /**
     * Helper function to create regl texture & regl buffers
     * @param {*} name the name for the texture (used to save & retrive data)
     * @param {*} parameters use if you need specific texture parameters
     */
    create_texture_and_buffer(name, {wrap = 'clamp', format = 'rgba', type = 'float', width = window.innerWidth, height = window.innerHeight}) {
        const regl = this.regl;
        const framebuffer_width = width;
        const framebuffer_height = height;

        // Create a regl texture and a regl buffer linked to the regl texture
        const text = regl.texture({ width: framebuffer_width, height: framebuffer_height, wrap: wrap, format: format, type: type })
        const buffer = regl.framebuffer({ color: [text], width: framebuffer_width, height: framebuffer_height, })
        
        this.textures_and_buffers[name] = [text, buffer]; 
    }

    /**
     * Function to run a rendering process and save the result in the designated texture
     * @param {*} name of the texture to render in
     * @param {*} render_function that is used to render the result to be saved in the texture
     * @returns 
     */
    render_in_texture(name, render_function){
        const regl = this.regl;
        const [texture, buffer] = this.textures_and_buffers[name];
        regl({ framebuffer: buffer })(() => {
            regl.clear({ color: [0,0,0,1], depth: 1 });
            render_function();
          });
        return texture;
    }

    /**
     * Retrieve a render texture with its name
     * @param {*} name 
     * @returns 
     */
    texture(name){
        const [texture, buffer] = this.textures_and_buffers[name];
        return texture;
    }

    /**
     * Core function to render a scene
     * Call the render passes in this function
     * @param {*} scene_state the description of the scene, time, dynamically modified parameters, etc.
     */
    render(scene_state) {
        
        const scene = scene_state.scene;
        const frame = scene_state.frame;

        /*---------------------------------------------------------------
            0. Camera Setup
        ---------------------------------------------------------------*/

        // Update the camera ratio in case the windows size changed
        scene.camera.update_format_ratio(frame.framebufferWidth, frame.framebufferHeight);
        
        // Compute the objects matrices at the beginning of each frame
        // Note: for optimizing performance, some matrices could be precomputed and shared among different objects
        scene.camera.compute_objects_transformation_matrices(scene.objects);

        /*---------------------------------------------------------------
            1. Base Render Passes
        ---------------------------------------------------------------*/

        // Render call: the result will be stored in the texture "base"
        this.render_in_texture("base", () =>{

            // Prepare the z_buffer and object with default black color
            this.pre_processing.render(scene_state);

            // Render the background
            this.flat_color.render(scene_state);

            // Render the terrain
            this.terrain.render(scene_state);

            // Render shaded objects
            this.blinn_phong.render(scene_state);

            // Render the reflection of mirror objects on top
            this.mirror.render(scene_state, (s_s) => {
                this.pre_processing.render(scene_state);
                this.flat_color.render(s_s);
                this.terrain.render(scene_state);
                this.blinn_phong.render(s_s);
            });    
        })

        /*---------------------------------------------------------------
            2. Shadows Render Pass
        ---------------------------------------------------------------*/
        
        // Render the shadows of the scene in a black & white texture. White means shadow.
        this.render_in_texture("shadows", () =>{

            // Prepare the z_buffer and object with default black color
            this.pre_processing.render(scene_state);


            // Render the shadows
            this.shadows.render(scene_state);
        })
        

        this.render_in_texture("shadows_blurred", () =>{
            
            this.blur.render(scene_state, this.texture("shadows"), true);
            //this.big_blur.render(scene_state, this.texture("shadows"), true);
        })

        this.render_in_texture("distances", () =>{

            this.shadow_map.render(scene_state);
        })

        /*---------------------------------------------------------------
            3. Compositing
        ---------------------------------------------------------------*/

        // Mix the base color of the scene with the shadows information to create the final result
        this.render_in_texture("with_shadows", () => {
            this.map_mixer.render(scene_state, this.texture("shadows_blurred"), this.texture("base"));
        });

        this.render_in_texture("bloom", () => {
            this.bloom.render(scene_state, this.texture("with_shadows"));

            this.anti_bloom.render(scene_state, this.texture("bloom"), this.texture("distances"));
        })
        
        this.render_in_texture("blurred_bloom", () => {
            this.blur.render(scene_state, this.texture("bloom"));
        })

        this.render_in_texture("scene_with_bloom", () => {
            this.bloom_mixer.render(scene_state, this.texture("with_shadows"), this.texture("blurred_bloom"));
        })



        //this.map_mixer.render(scene_state, this.texture("shadows"), this.texture("base"));
        //this.bloom.render(scene_state, this.texture("with_shadows"));
        //this.blur.render(scene_state, this.texture("blurred_bloom"), true);


        this.fog_mixer.render(scene_state, this.texture("distances"), this.texture("scene_with_bloom"), scene_state.ui_params.fog_distance);
    }
}




