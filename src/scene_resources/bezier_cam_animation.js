import { vec2, vec3, vec4, mat3, mat4 } from "../../lib/gl-matrix_3.3.0/esm/index.js"

export class BezierCamAnimation{

  constructor(pos_points, look_points, duration){
    if(!pos_points || pos_points.length != 4 || 
      !look_points || look_points.length != 4){
      throw new Error("Invalid camera or points");
    }
    this.pos_points = pos_points;
    this.look_points = look_points;
    this.duration = duration;
    this.t = 0;

    this.pos = this.get_current(pos_points);
    this.look = this.get_current(look_points);
  }

  is_animation_finished(){
    return this.t >= 1;
  }

  get_current(points){
    const p0 = vec3.clone(points[0]);
    const p1 = vec3.clone(points[1]);
    const p2 = vec3.clone(points[2]);
    const p3 = vec3.clone(points[3]);

    const s0 = Math.pow(1 - this.t, 3);
    const s1 = 3 * Math.pow(1 - this.t, 2) * this.t;
    const s2 = 3 * (1 - this.t) * Math.pow(this.t, 2);
    const s3 = Math.pow(this.t, 3);

    vec3.scale(p0, p0, s0);
    vec3.scale(p1, p1, s1);
    vec3.scale(p2, p2, s2);
    vec3.scale(p3, p3, s3);

    vec3.add(p0, p0, p1);
    vec3.add(p0, p0, p2);
    vec3.add(p0, p0, p3);

    return p0;
  }

  update(dt){
    this.t += dt / this.duration;

    if(this.t > 1){
      this.t = 1;
    }

    this.pos = this.get_current(this.pos_points);
    this.look = this.get_current(this.look_points);

    return {pos: this.pos, look: this.look};
  }
}