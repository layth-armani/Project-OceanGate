import { POVCamera } from "../scene_resources/camera.js"
import * as MATERIALS from "../render/materials.js"
import { cg_mesh_make_uv_sphere, cg_mesh_make_square} from "../cg_libraries/cg_mesh.js"
import { terrain_build_mesh } from "../scene_resources/dendry_terrain_generation.js"
import { noise_functions } from "../render/shader_renderers/noise_sr.js"
import { Scene } from "./scene.js"
import { vec3 } from "../../lib/gl-matrix_3.3.0/esm/index.js"
import { create_button, create_slider, create_hotkey_action, load_texture } from "../cg_libraries/cg_web.js"
import { ResourceManager } from "../scene_resources/resource_manager.js"
import { ProceduralTextureGenerator} from "../render/procedural_texture_generator.js"


export class DemoScene extends Scene {

  /**
   * A scene featuring a procedurally generated terrain with dynamic objects
   * 
   * @param {ResourceManager} resource_manager 
   * @param {ProceduralTextureGenerator} procedural_texture_generator 
   */
  constructor(resource_manager, procedural_texture_generator){
    super();

    this.resource_manager = resource_manager;    
    this.procedural_texture_generator = procedural_texture_generator;

    // Additional helper lists to better organize dynamic object generation
    this.static_objects = [];
    this.dynamic_objects = [];

    this.initialize_scene();
    this.initialize_actor_actions();
  }

  initialize_scene(){

    // Add lights
    this.lights.push({
      position : [0,-2.5,4.5], 
      color: [0.75, 0.75, 0.75]
    });
    this.lights.push({
      position : [0,2.5,4.5],  
      color: [0.75, 0.75, 0.75]
    });
    
    const width = 500;
    const height = 500;
    const terrain_translation = [0, 0, -2];  // Adjusted from [0, 0, -20]

    this.procedural_texture_generator.compute_texture(
      "sand", 
      noise_functions.Sand,
      {mouse_offset: [-12.24, 8.15],
        zoom_factor: 1.,
        width: 1080,
        height: 1080,
        as_texture: true
      }
    );

    this.procedural_texture_generator.compute_texture(
      "deep_sea", 
      noise_functions.DeepSea,
      {mouse_offset: [-12.24, 8.15],
        zoom_factor: 1.,
        width: 1080,
        height: 1080,
        as_texture: true
      }
    );

    this.procedural_texture_generator.compute_texture(
      "coral", 
      noise_functions.Coral,
      {mouse_offset: [-12.24, 8.15],
        zoom_factor: 1.,
        width: 180,
        height: 180,
        as_texture: true
      }
    );

    this.procedural_texture_generator.compute_texture(
      "coral_normal", 
      noise_functions.Coral_Normal,
      {mouse_offset: [-12.24, 8.15],
        zoom_factor: 1.,
        width: 180,
        height: 180,
        as_texture: true
      }
    );

    // Compute base perlin/FBM noise
    const perlin_height_map = this.procedural_texture_generator.compute_texture(
      "perlin_heightmap", 
      noise_functions.FBM_for_terrain, 
      { width, height, mouse_offset: [-12.24, 8.15] }
    );
    const dendry_height_map = this.procedural_texture_generator.compute_texture(
      "dendry_heightmap",
      noise_functions.Dendry, 
      { width, height, mouse_offset: [-12.24, 8.15] }
    );
    
    this.TERRAIN_SCALE = [20, 20, 2];
    const terrain_mesh = terrain_build_mesh(perlin_height_map, dendry_height_map);
    this.resource_manager.add_procedural_mesh("mesh_terrain", terrain_mesh);
    this.resource_manager.add_procedural_mesh("mesh_sphere_env_map", cg_mesh_make_uv_sphere(16));
    this.resource_manager.add_procedural_mesh("mesh_vertical_square_x", cg_mesh_make_square(1.0, 1, [1, 0, 0], Math.PI/4));
    this.resource_manager.add_procedural_mesh("mesh_vertical_square_y", cg_mesh_make_square(1.0, 1, [0, 1, 0], Math.PI/4));
    this.resource_manager.add_procedural_mesh("mesh_vertical_square_z", cg_mesh_make_square(1.0, 1, [0, 0, 1], Math.PI/4));



    // Add some meshes to the static objects list
    this.static_objects.push({
      translation: [0, 0, 0],
      scale: [10, 10, 10],
      mesh_reference: 'mesh_sphere_env_map',
      material: MATERIALS.diffuse('deep_sea')
    });

    this.static_objects.push({
      translation: terrain_translation,
      scale: this.TERRAIN_SCALE,
      mesh_reference: 'mesh_terrain',
      material: MATERIALS.diffuse('sand')
    });

    place_random_corals(this.dynamic_objects, this.actors, terrain_mesh, this.TERRAIN_SCALE, terrain_translation);

    // Combine the dynamic & static objects into one array
    this.objects = this.static_objects.concat(this.dynamic_objects);

    // We add the (static) lights to the actor list to allow them to be modified from the UI
    this.lights.forEach((light, i) => {
      this.actors[`light_${i}`] = light
    });
  }

  /**
   * Initialize the evolve function that describes the behaviour of each actor 
   */
  initialize_actor_actions(){
    
    for (const name in this.actors) {
      if (name.includes("coral")){
        const coral = this.actors[name];
        coral.evolve;
      }
      // Lights
      else if (name.includes("light")){
        const light = this.actors[name];
        const light_idx = parseInt(name.split("_")[1]);
        light.evolve = (dt) => {
          const curr_pos = light.position;
          light.position = [curr_pos[0], curr_pos[1], this.ui_params.light_height[light_idx]];
        }
      }
    }
  }

  /**
   * Initialize custom scene-specific UI parameters to allow interactive control of selected scene elements.
   * This function is called in main() if the scene is active.
   */
  initialize_ui_params(){

    this.ui_params.light_height = [0.7, 0.6];

    // Set preset view
    create_hotkey_action("Preset view", "1", () => {
      this.camera.set_preset_view({
        pos: [0, 0, 0],
        look_dir : [1, 0, 0]
      })
    });
    
    // Create a slider to change the height of each light
    const n_steps_slider = 100;
    const min_light_height_1 = 0.7; 
    const max_light_height_1 = 0.9; 
    create_slider("Height light 1 ", [0, n_steps_slider], (i) => {
      this.ui_params.light_height[0] = min_light_height_1 + i * (max_light_height_1 - min_light_height_1) / n_steps_slider;
    });
    const min_light_height_2 = 0.6;  
    const max_light_height_2 = 0.8;  
    create_slider("Height light 2 ", [0, n_steps_slider], (i) => {
      this.ui_params.light_height[1] = min_light_height_2 + i * (max_light_height_2 - min_light_height_2) / n_steps_slider;
    });

    create_slider(
      "movement speed", 
      [0, 100], 
      (i) => {
        const new_speed = this.camera.MIN_MOV_SPEED + (i / n_steps_slider) * (this.camera.MAX_MOV_SPEED - this.camera.MIN_MOV_SPEED);
        this.camera.setMovSpeed(new_speed);
      }
    )

    create_slider(
      "sensitivity",
      [0, 100], 
      (i) => {
        const new_sens = this.camera.MIN_ROT_SENSITIVITY + (i / n_steps_slider) * (this.camera.MAX_ROT_SENSITIVITY - this.camera.MIN_ROT_SENSITIVITY);
        this.camera.setRotSensitivity(new_sens);
      }
    )
    

    // Add button to generate random terrain
    create_button("Random terrain", () => {this.random_terrain()});
  }

  /**
   * Generate a random terrain
   */
  random_terrain(){
    const x = Math.round((Math.random()-0.5)*1000);
    const y = Math.round((Math.random()-0.5)*1000);
    console.log(`seed: [${x}, ${y}]`)
    this.recompute_terrain([x, y]);
  }

  /**
   * Allow the generate a new terrain without recreating the whole scene
   * @param {*} offset the new offset to compute the noise for the heightmap
   */
  recompute_terrain(offset){
    // Clear the list of dynamic objects
    this.dynamic_objects = [];

    // Compute a new height map
    const height_map = this.procedural_texture_generator.compute_texture(
      "perlin_heightmap", 
      noise_functions.FBM_for_terrain, 
      {width: 96, height: 96, mouse_offset: offset}
    );
    const d_height_map = this.procedural_texture_generator.compute_texture(
      "dendry_heightmap", 
      noise_functions.Dendry, 
      {width: 96, height: 96, mouse_offset: offset}
    );

    // Recompute the terrain mesh with the new heigthmap and replace
    // the old one in the resources manager
    const terrain_mesh = terrain_build_mesh(height_map, d_height_map);
    this.resource_manager.add_procedural_mesh("mesh_terrain", terrain_mesh);
    
    // Place the trees on this new terrain
    place_random_corals(this.dynamic_objects, this.actors, terrain_mesh, this.TERRAIN_SCALE, this.static_objects[1].translation);
    // Reinitialize the actors actions
    this.initialize_actor_actions();

    // Update the scene objects
    this.objects = this.static_objects.concat(this.dynamic_objects);
  }

}



/**
 * Given a vertex, decide wether to place something on it or not
 * @param {*} index of the vertex 
 * @returns 
 */
function decide(index){
  const chance = 1000; // the higher this value, the less likely it is to place an object
  const idx = (pseudo_random_int(index))%chance;
  return idx
}

/**
 * Gives a pseudo random number based on an index value
 * @param {*} index random seed 
 * @returns a pseudo random int
 */
function pseudo_random_int(index) {
  index = (index ^ 0x5DEECE66D) & ((1 << 31) - 1);
  index = (index * 48271) % 2147483647; // Prime modulus
  return (index & 0x7FFFFFFF); 
}

function place_random_corals(objects, actors, terrain_mesh, TERRAIN_SCALE, terrain_translation){
  const up_vector = [0,0,1];
  let coral_count = 0;
  
  const light_positions = Object.entries(actors)
    .filter(([name]) => name.startsWith("light_"))
    .map(([, light]) => light.position);
  const mean_light = light_positions
    .reduce((acc, pos) => [acc[0]+pos[0], acc[1]+pos[1], acc[2]+pos[2]], [0,0,0])
    .map(c => c / light_positions.length);

  terrain_mesh.vertex_positions.forEach((vertex, index) => {
    const position = vertex;
    const normal   = terrain_mesh.vertex_normals[index];
    if (decide(index) !== 0) return;
    if (position[2] <= -1 || position[2] >= 1) return;
    if (vec3.angle(up_vector, normal) >= Math.PI/6) return;
    if (Math.abs(position[0]) >= 0.5 || Math.abs(position[1]) >= 0.5) return;
    
    coral_count++;
    const mesh_opts = ['mesh_vertical_square_x', 'mesh_vertical_square_y'];
    const min_size = 1.0, max_size = 2.0;
    const scale_val = min_size + (max_size-min_size) * (pseudo_random_int(index+1234)%1000)/1000;
    const base_trans = vec3.add(
      [0,0,0],
      vec3.mul([0,0,0], TERRAIN_SCALE, position),
      [terrain_translation[0], terrain_translation[1], terrain_translation[2] + 0.1]
    );

    mesh_opts.forEach(mesh_reference => {
      const normal_axis = mesh_reference.endsWith('_x')
        ? [1,0,0]
        : [0,1,0];

      const to_light = vec3.sub([0,0,0], mean_light, base_trans);
      vec3.normalize(to_light, to_light);
      const dp = vec3.dot(normal_axis, to_light);
      const angle = dp < 0 ? Math.PI : 0; 

      const coral = {
        translation: [...base_trans],
        scale:       [scale_val, scale_val, scale_val],
        mesh_reference,
        material:    MATERIALS.diffuse('coral', true, true, 'coral_normal'),
        rotation:    { axis: normal_axis, angle }
      };
      coral.evolve = (dt) => {
        const pulse = 0.1 * Math.sin(Date.now() * 0.001 + index);
        coral.scale = [scale_val + pulse, scale_val + pulse, scale_val + pulse];
      };

      objects.push(coral);
      actors[`coral_${objects.length}`] = coral;
    });
  });
  //console.log("Corals placed:", coral_count);
}



