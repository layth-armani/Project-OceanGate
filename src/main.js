import { createREGL } from "../lib/regljs_2.1.0/regl.module.js"

// UI functions
import { 
  DOM_loaded_promise,
  create_button, 
  create_slider, 
  clear_overlay,
  create_button_with_hotkey, 
  create_hotkey_action, 
  toggle_overlay_visibility 
} from "./cg_libraries/cg_web.js"

// Render
import { SceneRenderer } from "./render/scene_renderer.js"
import { ResourceManager } from "./scene_resources/resource_manager.js"
import { ProceduralTextureGenerator } from "./render/procedural_texture_generator.js";

// Scenes
import { TutorialScene } from "./scenes/tutorial_scene.js";
import { DemoScene } from "./scenes/demo_scene.js";
import { distance } from "../lib/gl-matrix_3.3.0/esm/vec3.js";
import { MilestoneScene } from "./scenes/milestone_scene.js";
import { FOG_DEFAULT_DISTANCE, FOG_MIN_DISTANCE, FOG_MAX_DISTANCE } from "./render/shader_renderers/fog_mixer_sr.js";
import { DEFAULT_BLOOM_THRESHOLD, MAX_BLOOM_THRESHOLD } from "./render/shader_renderers/bloom_sr.js";
// import { distance } from "../lib/gl-matrix_3.3.0/esm/vec3.js";

DOM_loaded_promise.then(main)

async function main() {

  /*---------------------------------------------------------------
    1. Canvas Setup
  ---------------------------------------------------------------*/

  // REGL creates their own canvas
  const regl = createREGL({
    profile: true, // Can be useful to measure the size of buffers/textures in memory
    extensions: [  // Activate some WebGL extensions to access advanced features that are not part of the core WebGL specification
      'OES_texture_float', 'OES_texture_float_linear', 'WEBGL_color_buffer_float',
      'OES_vertex_array_object', 'OES_element_index_uint', 'WEBGL_depth_texture'
    ],
    attributes: {
      premultipliedAlpha: true,
      alpha: true
    }
  })

  // The <canvas> object (HTML element for drawing graphics) was created by REGL: we take a handle to it
  const canvas_elem = document.getElementsByTagName('canvas')[0]
  canvas_elem.tabIndex = 1;
  {
    // Resize canvas to fit the window
    function resize_canvas() {
      canvas_elem.width = window.innerWidth
      canvas_elem.height = window.innerHeight
    }
    resize_canvas()
    window.addEventListener('resize', resize_canvas)
  }

  /*---------------------------------------------------------------
    2. UI Setup
  ---------------------------------------------------------------*/

  /**
   * Object used to propagate parameters that the user can change in the interface.
   * Define here your parameters.
   */
  const ui_global_params = {
    bloom_threshold: DEFAULT_BLOOM_THRESHOLD,
    fog_distance: FOG_DEFAULT_DISTANCE,
    is_paused: false,
  }

  function initialize_ui_params(){

    const n_steps_slider = 100;

    create_slider(
      "fog distance",
      [0, n_steps_slider],
      (i) => {
        ui_global_params.fog_distance = FOG_MIN_DISTANCE + (i / n_steps_slider) * (FOG_MAX_DISTANCE - FOG_MIN_DISTANCE);
      },
      1
    )

    create_slider(
      "bloom threshold",
      [0, n_steps_slider],
      (i) => {
        ui_global_params.bloom_threshold = (i / n_steps_slider) * MAX_BLOOM_THRESHOLD;
      },
      1
    )

    // Bind a hotkey to hide the overlay
    create_hotkey_action("Hide overlay", "h", ()=>{toggle_overlay_visibility()});

    // Create a pause button
    create_hotkey_action("Pause", "p", () => {
      ui_global_params.is_paused = !ui_global_params.is_paused;
    });
  }

  /*---------------------------------------------------------------
    3. Camera Listeners
  ---------------------------------------------------------------*/

  // Rotate camera position by dragging with the mouse
  canvas_elem.addEventListener('mousemove', (event) => {
    // If left or middle button is pressed
    if (event.buttons & 1) {
      active_scene.camera.rotate_action(event.movementX, event.movementY);
    }
    else if (event.buttons & 4) {
      active_scene.camera.move_action(event.movementX, event.movementY);
    }
  })

  const keysDown = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
  };
  const forwardKeys = ['W', 'w', 'ArrowUp'];
  const backwardKeys = ['S', 's', 'ArrowDown'];
  const leftKeys = ['A', 'a', 'ArrowLeft'];
  const rightKeys = ['D', 'd', 'ArrowRight'];
  const upKeys = [' '];
  const downKeys = ['Shift'];

  canvas_elem.addEventListener('keydown', (event) => {
    if (forwardKeys.includes(event.key)) keysDown['forward'] = true;
    if (backwardKeys.includes(event.key)) keysDown['backward'] = true;
    if (leftKeys.includes(event.key)) keysDown['left'] = true;
    if (rightKeys.includes(event.key)) keysDown['right'] = true;
    if (upKeys.includes(event.key)) keysDown['up'] = true;
    if (downKeys.includes(event.key)) keysDown['down'] = true;
  })
  canvas_elem.addEventListener('keyup', (event) => {
    if (forwardKeys.includes(event.key)) keysDown['forward'] = false;
    if (backwardKeys.includes(event.key)) keysDown['backward'] = false;
    if (leftKeys.includes(event.key)) keysDown['left'] = false;
    if (rightKeys.includes(event.key)) keysDown['right'] = false;
    if (upKeys.includes(event.key)) keysDown['up'] = false;
    if (downKeys.includes(event.key)) keysDown['down'] = false;
  })

  /*---------------------------------------------------------------
    4. Resources and Scene Instantiation
  ---------------------------------------------------------------*/

  // Instantiate the resources manager
  const resource_manager = await new ResourceManager(regl).load_resources();
  const procedural_texture_generator = new ProceduralTextureGenerator(regl, resource_manager);

  // Instantiate the scene renderer, i.e. the entry point for rendering a scene
  const scene_renderer = new SceneRenderer(regl, resource_manager);

  // Instantiate scenes. Multiple different scenes can be set up here: 
  // which one is rendered depends on the value of the active_scene variable.
  const demo_scene = new DemoScene(resource_manager, procedural_texture_generator);
  const tutorial_scene = new TutorialScene(resource_manager);
  const milestone_scene = new MilestoneScene(resource_manager,procedural_texture_generator);

  const active_scene = milestone_scene;   // Assign the scene to be rendered to active_scene
  
  /*---------------------------------------------------------------
    5. UI Instantiation
  ---------------------------------------------------------------*/

  clear_overlay();
  initialize_ui_params();  // add general UI controls
  active_scene.initialize_ui_params();  // add scene-specific UI controls


  /*---------------------------------------------------------------
    6. Rendering Loop
  ---------------------------------------------------------------*/

  // Time variable
  let dt = 0;
  let prev_regl_time = 0;

  regl.frame((frame) => {

    // Reset canvas
    const background_color = [0.0, 0.0, 0.0, 1];
    regl.clear({ color: background_color });

    /*---------------------------------------------------------------
      Update the camera position
    ---------------------------------------------------------------*/

    if(active_scene.camera.is_externally_controlled()){
      active_scene.camera.animate(dt);
    }else{
      active_scene.camera.move_action(
        (keysDown['forward'] ? 1 : 0) - (keysDown['backward'] ? 1 : 0),
        (keysDown['right'] ? 1 : 0) - (keysDown['left'] ? 1 : 0),
        (keysDown['up'] ? 1 : 0) - (keysDown['down'] ? 1 : 0)
      );
    }
    
    
    /*---------------------------------------------------------------
      Update the current frame data
    ---------------------------------------------------------------*/

    // Compute the time elapsed since last frame
    dt = frame.time - prev_regl_time;
    prev_regl_time = frame.time;


    // If the time is not paused, iterate over all actors and call their evolve function
    if (!ui_global_params.is_paused){
      for (const name in active_scene.actors){
        if(!active_scene?.actors?.[name]?.evolve){
          console.log(active_scene.actors[name])
        }
        active_scene.actors[name].evolve(dt);
      }
      for (const name in active_scene.actors){
        const post_evolve = active_scene.actors[name].post_evolve;

        if (post_evolve){
          post_evolve(dt);
        }
      }
    }

    // The scene state contains all information necessary to render the scene in this frame
    const scene_state = {
      scene: active_scene,
      frame: frame,
      background_color: background_color,
      ui_params: { ...ui_global_params, ...active_scene.ui_params },
    }

    /*---------------------------------------------------------------
      Render the scene
    ---------------------------------------------------------------*/

    scene_renderer.render(scene_state);

  })


}


