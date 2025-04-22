
import * as MATERIALS from "../render/materials.js"
import { cg_mesh_make_uv_sphere } from "../cg_libraries/cg_mesh.js"

import { 
  create_slider, 
  create_button_with_hotkey, 
  create_hotkey_action 
} from "../cg_libraries/cg_web.js";
import { Scene } from "./scene.js";
import { ResourceManager } from "../scene_resources/resource_manager.js";
import { Material } from "../../lib/webgl-obj-loader_2.0.8/webgl-obj-loader.module.js";
import { vec3 } from "../../lib/gl-matrix_3.3.0/esm/index.js";
import { BezierCamAnimation } from "../scene_resources/bezier_cam_animation.js";

export class TutorialScene extends Scene {

  /**
   * A scene to be completed, used for the introductory tutorial
   * @param {ResourceManager} resource_manager 
   */
  constructor(resource_manager){
    super();
    
    this.resource_manager = resource_manager;

    this.static_objects = [];

    this.initialize_scene();
    this.initialize_actor_actions();
  }

  /**
   * Scene setup
   */
  initialize_scene(){

    // TODO

    this.lights.push({
      position : [0.0 , -2.0, 2.5],
      color: [1.0, 1.0, 0.9]
    });

    this.lights.push({
      position : [0.0 , 2.0, 2.5],
      color: [1.0, 1.0, 0.9]
    });

    this.static_objects.push({
      translation: [0.0, 0.0, 0.0],
      scale:[0.50, 0.50, 0.50],
      mesh_reference: 'fish.obj',
      material: MATERIALS.fish
    });

    this.objects = this.static_objects;

  }

  /**
   * Initialize the evolve function that describes the behaviour of each actor 
   */
  initialize_actor_actions(){

    // TODO

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
      }
    )

    create_slider(
      "sensitivity",
      [0, n_steps_slider], 
      (i) => {
        const new_sens = this.camera.MIN_ROT_SENSITIVITY + (i / n_steps_slider) * (this.camera.MAX_ROT_SENSITIVITY - this.camera.MIN_ROT_SENSITIVITY);
        this.camera.setRotSensitivity(new_sens);
      }
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

}
