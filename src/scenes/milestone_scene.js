import { POVCamera } from "../scene_resources/camera.js"
import * as MATERIALS from "../render/materials.js"
import { cg_mesh_make_uv_sphere, cg_mesh_make_square } from "../cg_libraries/cg_mesh.js"
import { terrain_build_mesh } from "../scene_resources/dendry_terrain_generation.js"
import { noise_functions } from "../render/shader_renderers/noise_sr.js"
import { Scene } from "./scene.js"
import { vec3 } from "../../lib/gl-matrix_3.3.0/esm/index.js"
import { create_button, create_slider, create_hotkey_action, create_divider, create_header } from "../cg_libraries/cg_web.js"
import { ResourceManager } from "../scene_resources/resource_manager.js"
import { ProceduralTextureGenerator } from "../render/procedural_texture_generator.js"
import { BoundedBox } from "../scene_resources/bounded_box.js"
import { BezierCamAnimation } from "../scene_resources/bezier_cam_animation.js";

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

    this.ambient_factor = 0.3;
    this.request_follow_fish = false;

    const boundary = new BoundedBox(
      vec3.fromValues(10, 10, 7),
      vec3.fromValues(-10, -10, -2)
    )

    this.camera.set_boundary(boundary);
    this.camera.set_pos(boundary.get_center())
    
    this.fish_rules = {
      max_vel: 3,
      max_acceleration: 3,
      min_vel: 1,
      view_distance: 3, 
      avoidance_distance: 1.5, 
      alignment: 1.5, 
      cohesion: 0.1, 
      separation: 1.5, 
      border: 10,
      random_force: 1,
      jitteryness: 0.9
    }

    this.initialize_scene();
    this.initialize_actor_actions();
  }

  /**
   * Scene setup
   */
  initialize_scene(){

    this.lights.push({
      position : [5,5,10],
      color: [0.4, 0.4, 0.4]
    });

    this.lights.push({
      position: [0,0,10],
      color: [0.4, 0.4, 0.4]
    });

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
      "rock", 
      noise_functions.Rock,
      {mouse_offset: [-12.24, 8.15],
        zoom_factor: 1.,
        width: 360,
        height: 360,
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

    const height_map = this.procedural_texture_generator.compute_texture(
      "perlin_heightmap", 
      noise_functions.FBM_for_terrain, 
      {width: 200, height: 200, mouse_offset: [-12.24, 8.15]}
    );
    const dendry_height_map = this.procedural_texture_generator.compute_texture(
      "dendry_heightmap",
      noise_functions.Dendry, 
      { width: 200, height: 200, mouse_offset: [-12.24, 8.15] }
    );
    this.WATER_LEVEL = 0.0;
    this.TERRAIN_SCALE = [70,70, 10];
    const terrain_mesh = terrain_build_mesh(height_map, dendry_height_map);
    this.resource_manager.add_procedural_mesh("mesh_terrain", terrain_mesh);
    this.resource_manager.add_procedural_mesh("mesh_sphere_env_map", cg_mesh_make_uv_sphere(16));
    this.resource_manager.add_procedural_mesh("mesh_vertical_square_x", cg_mesh_make_square(1.0, 1, [1, 0, 0], Math.PI/4));
    this.resource_manager.add_procedural_mesh("mesh_vertical_square_y", cg_mesh_make_square(1.0, 1, [0, 1, 0], Math.PI/4));
    this.resource_manager.add_procedural_mesh("mesh_vertical_square_x_grass", cg_mesh_make_square(1.0, 1, [-1, 0, 0], Math.PI/2));
    this.resource_manager.add_procedural_mesh("mesh_vertical_square_y_grass", cg_mesh_make_square(1.0, 1, [0, 1, 0], Math.PI/2));
    this.resource_manager.add_procedural_mesh("mesh_vertical_square_z", cg_mesh_make_square(1.0, 1, [0, 0, 1], Math.PI/4));

    this.create_random_fish(
      this.static_objects, 
      300, 
      this.camera.get_boundary()
    );
    
    this.static_objects.push({
      translation: [0, 0, 0],
      scale: [80., 80., 80.],
      mesh_reference: 'mesh_sphere_env_map',
      material: MATERIALS.diffuse('deep_sea')
    });

    
    this.static_objects.push({
      translation: [0, 0, -4],
      scale: [1., 1., 1.],
      mesh_reference: 'submarine.obj',
      material: MATERIALS.diffuse('submarine.png', false, false, null, [1, 1, 1])
    });

    this.static_objects.push({
      obj_name: "submarine_light",
      translation: [0, 0.7, -2.8],
      scale: [0.1, 0.1, 0.1],
      mesh_reference: 'sphere.obj',
      material: MATERIALS.gold,
      properties: ["extra_bloom"]
    })
    
    
    
    const terrain_translation = [0, 0, -10];
    this.static_objects.push({
          translation: terrain_translation,
          scale: this.TERRAIN_SCALE,
          mesh_reference: 'mesh_terrain',
          material: MATERIALS.diffuse('sand')
    });

    place_random_corals(this.dynamic_objects, this.actors, terrain_mesh, this.TERRAIN_SCALE, terrain_translation);
    place_random_rocks(this.static_objects,terrain_mesh, this.TERRAIN_SCALE,terrain_translation, 100);
    
    
    this.objects = this.static_objects.concat(this.dynamic_objects);

    this.actors["light_flickerer"] = {time: 0.7}
  }

  /**
   * Initialize the evolve function that describes the behaviour of each actor 
   */
  initialize_actor_actions(){

    this.actors["light_flickerer"].evolve = (dt) => {
      this.actors["light_flickerer"].time -= dt;

      if (this.actors["light_flickerer"].time <= 0){
        this.actors["light_flickerer"].time = Math.random() + 0.3;

        const submarine_material = this.static_objects.find(v => v.obj_name == "submarine_light").material;
        const bl_i = submarine_material.properties.indexOf("extra_bloom");

        if(bl_i >= 0){
          submarine_material.properties.splice(bl_i);
        }else{
          submarine_material.properties.push("extra_bloom");
        }
      }
    }

    const boids = Object.keys(this.actors).filter((actor) => this.actors[actor].is_boid).map((actor) => this.actors[actor]);
    let i = 0;

    for (const boid of boids) {

      boid.actor_name = "fish_" + i++;

      boid.evolve = (dt) => {

        const {max_vel, min_vel, max_acceleration, view_distance, avoidance_distance, alignment, cohesion, separation, border, random_force, jitteryness} = this.fish_rules;


        if (this.request_follow_fish && boid.actor_name == "fish_0"){
          this.request_follow_fish = false;
          this.camera.follow_fish(boid);
        }

        const visible_boids = boids.filter((other_boid) => 
          other_boid !== boid && 
          vec3.distance(boid.translation, other_boid.translation) < view_distance
        );

        const alignment_vector = vec3.create();
        const cohesion_vector = vec3.create();
        const separation_vector = vec3.create();

        if(!boid.random_point || !boid.random_point_time || boid.random_point_time <= 0){
          boid.random_point = vec3.random(vec3.create(), vec3.len(boid.velocity))

          const t = (1- jitteryness)
          boid.random_point_time = 0.2 + t * 9.5
        }
        boid.random_point_time -= dt;
        const noise_vector = this.slerp(boid.velocity, boid.random_point, 0.3)
        vec3.scale(noise_vector, noise_vector, random_force);

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
        vec3.add(new_velocity, new_velocity, noise_vector);
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

        let max_accel = max_acceleration * dt;

        let velocity_change_vec = vec3.sub(vec3.create(), new_velocity, boid.velocity);
        let velocity_change_length = vec3.length(velocity_change_vec);
        if (velocity_change_length > max_accel) {
          vec3.scale(velocity_change_vec, velocity_change_vec, max_accel / velocity_change_length);
        }

        vec3.add(boid.velocity, boid.velocity, velocity_change_vec);
      }

      boid.post_evolve = (dt) => {
        const new_translation = vec3.create();
        vec3.add(new_translation, boid.translation, vec3.scale(vec3.create(), boid.velocity, dt));
        boid.translation = new_translation
      }
    }
    for (const name in this.actors) {
      if (name.includes("coral")){
        const coral = this.actors[name];
        coral.evolve;
      }
    }
  }

  slerp(a, b, t){
    const omega = vec3.angle(a, b);

    const a_factor = Math.sin((1-t) * omega) / Math.sin(omega);
    const b_factor = Math.sin(t * omega) / Math.sin(omega);

    let c = vec3.scale(vec3.create(), a, a_factor);
    let d = vec3.scale(vec3.create(), b, b_factor);

    return vec3.add(vec3.create(), c, d);
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
      }
    )

    create_hotkey_action("Bezier Animation", "1", () => {
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

    create_hotkey_action("Bezier Animation", "2", () => {
      this.camera.set_animation(
        new BezierCamAnimation(
          [
            vec3.fromValues(-15, 5.48, -1.94),
            vec3.fromValues(0.59, 14.82, -1.39),
            vec3.fromValues(7.385125420185692, -3.1823858675880254, -1.2556412201632878),
            vec3.fromValues(9.91, 8.33, -1.99),
            vec3.fromValues(13.316309015360083, 10.211774453484207, -2),
          ],
          [
            vec3.fromValues(0.99, 0.08, -0.03),
            vec3.fromValues(-0.26, -0.94, -0.20),
            vec3.fromValues(0.99, -0.04, -0.06),
            vec3.fromValues(0.75, 0.64, -0.12),
            vec3.fromValues(0.7212364315453622, 0.6823402596605966, -0.11928864094297406),
          ],
          8
        )
      )
    });


    create_hotkey_action("Bezier Animation", "3", () => {
      this.camera.set_animation(
        new BezierCamAnimation(
          [
            vec3.fromValues(0, 11, -2),

            vec3.fromValues(-20, 3, 3),
            vec3.fromValues(0, -30, 6),
            vec3.fromValues(20, 3, 3),

            vec3.fromValues(0, 11, -2),
          ],
          [
            vec3.fromValues(0, -1, 0),

            vec3.fromValues(0.9165707348973663, 0.4, -0.3),
            vec3.fromValues(-0.01549348537948082, 0.8066988330402917, -0.4),
            vec3.fromValues(-0.8696065429838772, 0.4, -0.3),

            vec3.fromValues(0, -1, 0),
          ],
          8
        )
      )
    });

    create_hotkey_action("Follow fish", "f", () => {
      if (this.camera.get_fish()) {
        this.camera.unfollow_fish()
      }else{
        this.request_follow_fish = true;
      }
    });

    create_divider();

    create_header("fish settings");

    create_slider(
      "min velocity",
      [0, n_steps_slider],  
      (i) => {
        const new_min_vel = 0.5 + (i / n_steps_slider) * 19.5;
        if(new_min_vel > this.fish_rules.max_vel){
          this.fish_rules.max_vel = new_min_vel;
        }
        this.fish_rules.min_vel = new_min_vel;
      }
    )
    
    create_slider(
      "max velocity",
      [0, n_steps_slider],  
      (i) => {
        const new_max_vel = 2 + (i / n_steps_slider) * 30;
        if(new_max_vel < this.fish_rules.min_vel){
           this.fish_rules.min_vel = new_max_vel;
        }
        this.fish_rules.max_vel = new_max_vel;
      }
    )

    create_slider(
      "max acceleration",
      [0, n_steps_slider],  
      (i) => {
        const new_max_acc = 2 + (i / n_steps_slider) * 40;

        this.fish_rules.max_acceleration = new_max_acc;
      }
    )

    create_slider(
      "view distance",
      [0, n_steps_slider],  
      (i) => {
        const new_view_dist = 1 + (i / n_steps_slider) * 9;

        this.fish_rules.view_distance = new_view_dist;
      }
    )

    create_slider(
      "avoidance distance",
      [0, n_steps_slider],  
      (i) => {
        const new_avoidance_dist = 0.5 + (i / n_steps_slider) * 9.5;

        this.fish_rules.avoidance_distance = new_avoidance_dist;
      }
    )

    create_slider(
      "alignment force",
      [0, n_steps_slider],  
      (i) => {
        const new_alignment = 0.5 + (i / n_steps_slider) * 9.5;

        this.fish_rules.alignment = new_alignment;
      }
    )

    create_slider(
      "cohesion force",
      [0, n_steps_slider],  
      (i) => {
        const new_cohesion = 0.02 + (i / n_steps_slider) * 4;

        this.fish_rules.cohesion = new_cohesion;
      }
    )

    create_slider(
      "separation force",
      [0, n_steps_slider],  
      (i) => {
        const new_separation = 0.5 + (i / n_steps_slider) * 9.5;

        this.fish_rules.separation = new_separation;
      }
    )

    create_slider(
      "border force",
      [0, n_steps_slider],  
      (i) => {
        const new_border = 1 + (i / n_steps_slider) * 300;

        this.fish_rules.border = new_border;
      }
    )

    create_slider(
      "randomness force",
      [0, n_steps_slider],  
      (i) => {
        const new_random = 0.5 + (i / n_steps_slider) * 29.5;

        this.fish_rules.random_force = new_random;
      }
    )

    create_slider(
      "jitteryness",
      [0, n_steps_slider],  
      (i) => {
        const new_jitter = 0.01 + (i / n_steps_slider) * 0.98;

        this.fish_rules.jitteryness = new_jitter;
      }
    )
  }

  

  create_random_fish(objects, n_fish, bounds){
    const fish_rules = this.fish_rules;
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
      scale: [0.1, 0.1, 0.1],
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



function place_random_rocks(objects, terrain_mesh, TERRAIN_SCALE, terrain_translation, n_rocks) {
  const up_vector = [0, 0, 1];
  let rock_count = 0;

  // Shuffle indices for random placement
  const indices = Array.from({length: terrain_mesh.vertex_positions.length}, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  for (let k = 0; k < indices.length && rock_count < n_rocks; k++) {
    const index = indices[k];
    const position = terrain_mesh.vertex_positions[index];
    const normal = terrain_mesh.vertex_normals[index];

    // Placement filters: only slope and height
    if (position[2] <= -1 || position[2] >= 1) continue;
    if (vec3.angle(up_vector, normal) >= Math.PI / 6) continue;

    // World position
    const world_pos = vec3.add(
      [0, 0, 0],
      vec3.mul([0, 0, 0], TERRAIN_SCALE, position),
      [terrain_translation[0], terrain_translation[1], terrain_translation[2] ]
    );

    // Random scale for variety
    const min_scale = 0.3, max_scale = 0.7;
    const scale_val = min_scale + (max_scale - min_scale) * Math.random();

    const rock = {
      translation: [...world_pos],
      scale: [scale_val, scale_val, scale_val],
      mesh_reference: "rock.obj",
      material: MATERIALS.gray,
    };

    objects.push(rock);
    rock_count++;
  }
}



/**
 * Given a vertex, decide wether to place something on it or not
 * @param {*} index of the vertex 
 * @returns 
 */
function decide(index){
  const chance = 200; // the higher this value, the less likely it is to place an object
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

    coral_count++;
    const mesh_opts = ['mesh_vertical_square_x', 'mesh_vertical_square_y'];
    const min_size = 2.0, max_size = 5.0;
    const scale_val = min_size + (max_size-min_size) * (pseudo_random_int(index+1234)%1000)/1000;
    const base_trans = vec3.add(
      [0,0,0],
      vec3.mul([0,0,0], TERRAIN_SCALE, position),
      [terrain_translation[0], terrain_translation[1], terrain_translation[2] + 1.0]
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
        translation: [base_trans[0], base_trans[1], base_trans[2] - 0.5],
        scale:       [scale_val, scale_val, scale_val],
        mesh_reference,
        material:    MATERIALS.diffuse('coral', true, true, 'coral_normal'),
        rotation:    { axis: normal_axis, angle }
      };
      coral.evolve = (dt) => {
        const pulse =  0.2 * Math.sin(Date.now() * 0.001 + index);
        coral.scale = [scale_val + pulse, scale_val + pulse, scale_val + pulse];
      };

      objects.push(coral);
      actors[`coral_${objects.length}`] = coral;
    });
  });
  console.log("Corals placed:", coral_count);
}
  
