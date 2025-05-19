import { vec2, vec3, vec4, mat3, mat4 } from "../../lib/gl-matrix_3.3.0/esm/index.js"
import { max } from "../../lib/gl-matrix_3.3.0/esm/vec3.js";

export class BoundedBox{

  constructor(max_pos, min_pos){
    if(!max_pos || max_pos.length != 3 || !min_pos || min_pos.length != 3) {
      throw new Error("Invalid bounded box points format");
    }
    if(max_pos[0] < min_pos[0] || max_pos[1] < min_pos[1] || max_pos[2] < min_pos[2]){
      throw new Error("Invalid bounded box points");
    }
    this.max_pos = vec3.clone(max_pos);
    this.min_pos = vec3.clone(min_pos);
  }

  is_inside(point){
    if(!point || point.length != 3){
      throw new Error("Invalid point format");
    }
    return vec3.equals(
      this.compare_to_bounds(point),
      vec3.fromValues(0, 0, 0)
    )
  }

  clip_to_bounds(point){
    if(!point || point.length != 3){
      throw new Error("Invalid point format");
    }
    const result = vec3.create();

    const clip = (v, min, max) => Math.max(min, Math.min(v, max));

    result[0] = clip(point[0], this.min_pos[0], this.max_pos[0]);
    result[1] = clip(point[1], this.min_pos[1], this.max_pos[1]);
    result[2] = clip(point[2], this.min_pos[2], this.max_pos[2]);

    return result;
  }

  compare_to_bounds(point){
    if(!point || point.length != 3){
      throw new Error("Invalid point format");
    }
    const result = vec3.create();

    const cmp = (v, min, max) => (v > max) - (v < min);

    result[0] = cmp(point[0], this.min_pos[0], this.max_pos[0]);
    result[1] = cmp(point[1], this.min_pos[1], this.max_pos[1]);
    result[2] = cmp(point[2], this.min_pos[2], this.max_pos[2]);

    return result;
  }

  get_center(){
    return vec3.fromValues(
      (this.max_pos[0] + this.min_pos[0]) / 2,
      (this.max_pos[1] + this.min_pos[1]) / 2,
      (this.max_pos[2] + this.min_pos[2]) / 2
    );
  }


}