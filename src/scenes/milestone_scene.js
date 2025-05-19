import { POVCamera } from "../scene_resources/camera.js"
import * as MATERIALS from "../render/materials.js"
import { cg_mesh_make_uv_sphere } from "../cg_libraries/cg_mesh.js"
import { terrain_build_mesh } from "../scene_resources/terrain_generation.js"
import { noise_functions } from "../render/shader_renderers/noise_sr.js"
import { Scene } from "./scene.js"
import { vec3 } from "../../lib/gl-matrix_3.3.0/esm/index.js"
import { create_button, create_slider, create_hotkey_action } from "../cg_libraries/cg_web.js"
import { ResourceManager } from "../scene_resources/resource_manager.js"
import { ProceduralTextureGenerator } from "../render/procedural_texture_generator.js"
import { BoundedBox } from "../scene_resources/bounded_box.js"

export class MilestoneScene extends Scene {

  /**
   * A scene to be completed, used for the introductory tutorial
   * @param {ResourceManager} resource_manager 
   * @param {ProceduralTextureGenerator} procedural_texture_generator 
   */
  constructor(resource_manager, procedural_texture_generator){
    super();
    
    this.resource_manager = resource_manager;
    this.procedural_texture_generator = procedural_texture_generator;

    this.static_objects = [];
    this.dynamic_objects = [];

    const boundary = new BoundedBox(
      vec3.fromValues(2.37695, 0.508275, 0.690108),
      vec3.fromValues(0.41676, -0.59381, -0.899727)
    )

    this.camera.set_boundary(boundary);
    this.camera.set_pos(boundary.get_center())
    
    

    this.initialize_scene();
    this.initialize_actor_actions();
  }

  /**
   * Scene setup
   */
  initialize_scene(){

    this.lights.push({
      position : [-4,-5,7],
      color: [0.75, 0.75, 0.75]
    });

    this.lights.push({
      position : [-4,-5,7],
      color: [0.1, 0.1, 0.1]
    });

    const height_map = this.procedural_texture_generator.compute_texture(
      "perlin_heightmap", 
      noise_functions.FBM_for_terrain, 
      {width: 96, height: 96, mouse_offset: [-12.24, 8.15]}
    );
    this.WATER_LEVEL = 0.0;
    this.TERRAIN_SCALE = [10,10,0.5];
    const terrain_mesh = terrain_build_mesh(height_map, this.WATER_LEVEL);
    this.resource_manager.add_procedural_mesh("mesh_terrain", terrain_mesh);
    this.resource_manager.add_procedural_mesh("mesh_sphere_env_map", cg_mesh_make_uv_sphere(16));

    this.create_random_fish(
      this.static_objects, 
      20, 
      this.camera.get_boundary(),
      {max_vel: 0.4, min_vel: 0.1, view_distance: 0.3, avoidance_distance: 0.15, alignment: 0.15, cohesion: 0.01, separation: 0.15, border: 0.1}
    );

    this.static_objects.push({
      translation: [0, 0, 0],
      scale: [80., 80., 80.],
      mesh_reference: 'mesh_sphere_env_map',
      material: MATERIALS.night_sky
    });

    this.static_objects.push({
      translation: [0, 0, -1],
      scale: this.TERRAIN_SCALE,
      mesh_reference: 'mesh_terrain',
      material: MATERIALS.terrain
    });


    this.static_objects.push({
      translation: [1.50, 0.0, 0.0],
      scale:[0.30, 0.30, 0.30],
      mesh_reference: 'suzanne.obj',
      material: MATERIALS.gold
    });

    this.objects = this.static_objects;

    


  }

  /**
   * Initialize the evolve function that describes the behaviour of each actor 
   */
  initialize_actor_actions(){

    const boids = Object.keys(this.actors).filter((actor) => this.actors[actor].is_boid).map((actor) => this.actors[actor]);

    const {max_vel, min_vel, view_distance, avoidance_distance, alignment, cohesion, separation, border} = this.fish_rules;

    for (const boid of boids) {

      boid.evolve = (dt) => {

        const visible_boids = boids.filter((other_boid) => 
          other_boid !== boid && 
          vec3.distance(boid.translation, other_boid.translation) < view_distance
        );

        const alignment_vector = vec3.create();
        const cohesion_vector = vec3.create();
        const separation_vector = vec3.create();

        if(visible_boids && visible_boids.length != 0){
        
          for (const other_boid of visible_boids) {
            vec3.add(alignment_vector, alignment_vector, other_boid.velocity);
          }
          vec3.scale(alignment_vector, alignment_vector, (1 / visible_boids.length) * alignment);

          
          for (const other_boid of visible_boids) {
            const boid_to_other = vec3.create();
            vec3.sub(boid_to_other, other_boid.translation, boid.translation);
            vec3.add(cohesion_vector, cohesion_vector, boid_to_other);
          }
          vec3.scale(cohesion_vector, cohesion_vector, (1 / visible_boids.length) * cohesion);

          
          for (const other_boid of visible_boids) {
            const other_to_boid = vec3.create();
            vec3.sub(other_to_boid, boid.translation, other_boid.translation);
            const distance = Math.max(avoidance_distance/100, vec3.length(other_to_boid));
            if (distance < avoidance_distance) {
              vec3.scale(other_to_boid, other_to_boid, 1 / distance);
              vec3.add(separation_vector, separation_vector, other_to_boid);
            }
          }
          vec3.scale(separation_vector, separation_vector, separation);
        }

        const border_vector = vec3.create();
        vec3.scale(border_vector, boid.bounds.compare_to_bounds(boid.translation), -border);

        const new_velocity = vec3.clone(boid.velocity);
        vec3.add(new_velocity, new_velocity, alignment_vector);
        vec3.add(new_velocity, new_velocity, cohesion_vector);
        vec3.add(new_velocity, new_velocity, separation_vector);
        vec3.add(new_velocity, new_velocity, border_vector);

        const speed = vec3.length(new_velocity);
        if (speed > max_vel) {
          vec3.scale(new_velocity, new_velocity, max_vel / speed);
        }
        if (speed < min_vel) {
          vec3.scale(new_velocity, new_velocity, min_vel / speed);
        }

        boid.velocity = new_velocity;
      }

      boid.post_evolve = (dt) => {
        const new_translation = vec3.create();
        vec3.add(new_translation, boid.translation, vec3.scale(vec3.create(), boid.velocity, dt));
        boid.translation = new_translation
      }
    }
  }

  /**
   * Initialize custom scene-specific UI parameters to allow interactive control of selected scene elements.
   * This function is called in main() if the scene is active.
   */
  initialize_ui_params(){

    const n_steps_slider = 100;

      create_slider(
        "movement speed", 
        [0, n_steps_slider], 
        (i) => {
        const new_speed = this.camera.MIN_MOV_SPEED + (i / n_steps_slider) * (this.camera.MAX_MOV_SPEED - this.camera.MIN_MOV_SPEED);
        this.camera.setMovSpeed(new_speed);
        },
        1
      )

      create_slider(
        "sensitivity",
        [0, n_steps_slider],  
        (i) => {
        const new_sens = this.camera.MIN_ROT_SENSITIVITY + (i / n_steps_slider) * (this.camera.MAX_ROT_SENSITIVITY - this.camera.MIN_ROT_SENSITIVITY);
        this.camera.setRotSensitivity(new_sens);
        },
        1
      )

    create_hotkey_action("Bezier Animation", "o", () => {
      this.camera.set_animation(
        new BezierCamAnimation(
          [
            vec3.fromValues(-5.36, 2.36, 1.49),
            vec3.fromValues(-4.07, -4.59, 4.88),
            vec3.fromValues(6.55, -5.20, -0.60),
            vec3.fromValues(6.65, -1.86, -1.16)
          ],
          [
            vec3.fromValues(0.87, -0.39, -0.30),
            vec3.fromValues(0.48, 0.56, -0.67),
            vec3.fromValues(-0.63, 0.50, -0.60),
            vec3.fromValues(-0.92, 0.29, 0.27)
          ],
          5
        )
      )
    });

  }

  create_random_fish(objects, n_fish, bounds, fish_rules){
    if(!fish_rules || !fish_rules.max_vel || !fish_rules.alignment || !fish_rules.cohesion || !fish_rules.separation || !fish_rules.border){
      throw new Error("Invalid fish rules");
    }
    if(!bounds || !(bounds instanceof BoundedBox)){
      throw new Error("Invalid bounds");
    }

    this.fish_rules = fish_rules;

    for(let i=0; i<n_fish; i++){
      const fish = this.new_fish(bounds, fish_rules.max_vel);
      console.log("fish number " + i + " velocity: ", fish.velocity);
      objects.push(fish);
      this.actors[`fish_${i}`] = fish;
    }
  }

  new_fish(bounds, max_speed){
    if(!bounds || !(bounds instanceof BoundedBox)){
      throw new Error("Invalid bounds");
    }

    const max_coord_speed = max_speed / Math.sqrt(3);

    return {
      translation: bounds.random_point(),
      scale: [0.01, 0.01, 0.01],
      mesh_reference: "fish.obj",
      material: MATERIALS.fish,
      is_boid: true,
      velocity: vec3.fromValues(
        (Math.random() * max_coord_speed) * 2 - max_coord_speed,
        (Math.random() * max_coord_speed) * 2 - max_coord_speed,
        (Math.random() * max_coord_speed) * 2 - max_coord_speed
      ),
      bounds
    }

  }

}
